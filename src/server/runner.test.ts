/**
 * Spend-radius tests for the cron tick.
 *
 * These exist because of what arming the cron room means: `tick` has never run
 * in production, so its first fire is the first time every topic in the app is
 * examined — and every scan it starts is owner-billed Exa/Firecrawl search plus
 * Haiku judging. The question that has to have a provable answer is "how many
 * scans does a long-dead cron start when it wakes up", and the two things that
 * bound it — advancing the schedule from `now` rather than from the missed
 * slot, and FUNNEL.maxTopicsPerTick — are what these tests pin.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { TopicData } from '../types'
import { FUNNEL } from '../config'

const enqueueJob = vi.fn(async () => 'job_1')
const buildCronContext = vi.fn()

vi.mock('deepspace/worker', () => ({
  enqueueJob: (...args: unknown[]) => enqueueJob(...(args as [])),
  buildCronContext: (...args: unknown[]) => buildCronContext(...(args as [])),
}))

const { runDueScans } = await import('./runner')
const { computeNextDueAt } = await import('./schedule')

type Env = Parameters<typeof runDueScans>[0]

interface TopicRow {
  recordId: string
  data: TopicData
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const NOW = Date.parse('2026-08-20T03:31:00Z')

function topic(over: Partial<TopicData> & { recordId?: string } = {}): TopicRow {
  const { recordId, ...data } = over
  return {
    recordId: recordId ?? `tp_${Math.random().toString(36).slice(2)}`,
    data: {
      name: 'A topic',
      q1Find: 'people consolidating tools',
      q2Promote: 'our thing',
      queries: ['a', 'b'],
      venues: ['reddit'],
      scansPerDay: 1,
      timeOfDay: null,
      draftMode: 'manual',
      replyVoice: '',
      paused: false,
      nextDueAt: NOW - HOUR,
      lastScanAt: 0,
      ownerUserId: 'owner',
      ...data,
    } as TopicData,
  }
}

/**
 * Wire runDueScans to an in-memory topics table. `updates` records every
 * schedule advance so a test can assert the topic actually moved into the
 * future rather than onto the next stale slot.
 */
function harness(rows: TopicRow[], scansPaused = false) {
  const updates: Array<{ recordId: string; data: Record<string, unknown> }> = []
  const queries: Array<unknown> = []

  buildCronContext.mockReturnValue({
    ownerUserId: 'owner',
    records: {
      query: vi.fn(async (collection: string, opts?: { where?: Record<string, unknown> }) => {
        // The kill switch is read first, from its own collection. Serve it
        // here rather than letting the assertion below throw into
        // scansPaused's catch, which would report "not paused" either way and
        // make a broken switch look like a working one.
        if (collection === 'settings') {
          return [{ recordId: 'st_1', data: { key: 'scansPaused', value: String(scansPaused) } }]
        }
        expect(collection).toBe('topics')
        queries.push(opts)
        let out = rows
        // Model what RecordRoom actually does with `where`, because the whole
        // point of the filter fix is that it does something surprising: the
        // value is bound into the SQL uncoerced, so a JS boolean never equals
        // the 0/1 a boolean-interpreted number column holds and the query comes
        // back empty. Verified against the production room on 2026-08-20. A
        // fake that quietly filtered by value instead would let the old,
        // permanently-empty query pass these tests.
        for (const [field, value] of Object.entries(opts?.where ?? {})) {
          out =
            typeof value === 'boolean'
              ? []
              : out.filter((r) => (r.data as unknown as Record<string, unknown>)[field] === value)
        }
        return out.map((r) => ({ recordId: r.recordId, data: { ...r.data } }))
      }),
      update: vi.fn(async (_c: string, recordId: string, data: Record<string, unknown>) => {
        updates.push({ recordId, data })
        const row = rows.find((r) => r.recordId === recordId)
        if (row) Object.assign(row.data, data)
        return {}
      }),
      create: vi.fn(),
      delete: vi.fn(),
    },
    integrations: { call: vi.fn() },
  })

  const env = {
    APP_NAME: 'threadhunt',
    OWNER_USER_ID: 'owner',
    RECORD_ROOMS: {},
    JOB_ROOMS: {},
  } as unknown as Env

  return { env, updates, queries }
}

/** The topic ids a run enqueued a scan for, in order. */
function scannedTopicIds(): string[] {
  return enqueueJob.mock.calls.map((call) => {
    const payload = (call as unknown as unknown[])[3] as { topicId: string }
    return payload.topicId
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  enqueueJob.mockClear()
  buildCronContext.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('runDueScans — a long-dead cron waking up', () => {
  // The whole point. A daily topic two months past its slot must produce ONE
  // scan and then resync to the present. If the schedule advanced from the slot
  // it fired instead of from `now`, the next tick would land on another stale
  // slot and fire again, replaying ~60 owner-billed scans an hour apart until
  // it caught up.
  it('runs one scan for a topic two months overdue, not one per missed day', async () => {
    const rows = [topic({ recordId: 'stale', nextDueAt: NOW - 60 * DAY, lastScanAt: NOW - 60 * DAY })]
    const { env, updates } = harness(rows)

    await runDueScans(env)

    expect(scannedTopicIds()).toEqual(['stale'])
    expect(updates).toHaveLength(1)
    expect(updates[0].data.nextDueAt as number).toBeGreaterThan(NOW)
  })

  it('does not fire the same topic again on the following tick', async () => {
    const rows = [topic({ recordId: 'stale', nextDueAt: NOW - 60 * DAY })]
    const { env } = harness(rows)

    await runDueScans(env)
    vi.setSystemTime(NOW + HOUR)
    await runDueScans(env)
    vi.setSystemTime(NOW + 2 * HOUR)
    await runDueScans(env)

    expect(scannedTopicIds()).toEqual(['stale'])
  })

  // The cap is what keeps a pile of simultaneously-overdue topics from turning
  // one tick into a wall of billed searches. It exists for the Worker
  // subrequest budget, and it is also the spend ceiling, so pin it.
  it('starts at most FUNNEL.maxTopicsPerTick scans however many topics are due', async () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      topic({ recordId: `t${i}`, nextDueAt: NOW - (i + 1) * DAY }),
    )
    const { env } = harness(rows)

    await runDueScans(env)

    expect(scannedTopicIds()).toHaveLength(FUNNEL.maxTopicsPerTick)
  })

  it('drains a backlog of topics one tick at a time, never repeating one', async () => {
    const rows = Array.from({ length: 4 }, (_, i) => topic({ recordId: `t${i}`, nextDueAt: NOW - DAY }))
    const { env } = harness(rows)

    for (let tick = 0; tick < 4; tick++) {
      await runDueScans(env)
      vi.setSystemTime(Date.now() + HOUR)
    }

    const scanned = scannedTopicIds()
    expect(scanned).toHaveLength(4)
    expect(new Set(scanned).size).toBe(4)
  })

  it('leaves topics whose slot is still in the future alone', async () => {
    const { env, updates } = harness([
      topic({ recordId: 'future', nextDueAt: NOW + 6 * HOUR }),
      topic({ recordId: 'tomorrow', nextDueAt: NOW + DAY }),
    ])

    await runDueScans(env)

    expect(scannedTopicIds()).toEqual([])
    expect(updates).toEqual([])
  })

  /**
   * The production shape, read read-only over the owner's WebSocket on
   * 2026-08-20: exactly one topic, unpaused, already manually scanned, with
   * nextDueAt about 23 hours out. The first armed tick must be a no-op.
   */
  it('spends nothing on the first tick against the real production topic', async () => {
    const { env, updates } = harness([
      topic({
        recordId: '1787193956284_fpx4k6',
        name: 'People looking to consolidate',
        nextDueAt: 1787280356254,
        lastScanAt: 1787194054851,
        scansPerDay: 1,
        timeOfDay: null,
        venues: ['reddit', 'hackernews'],
      }),
    ])

    await runDueScans(env)

    expect(scannedTopicIds()).toEqual([])
    expect(updates).toEqual([])
  })
})

describe('runDueScans — the paused filter', () => {
  // Regression guard. This used to be `where: { paused: false }`, which the
  // RecordRoom binds into SQL uncoerced: the boolean never equals the 0/1 the
  // number column holds, the query matched nothing, and the tick would have
  // been a permanent no-op no matter how overdue a topic was. Verified against
  // production, where `where: { paused: false }` returned 0 rows for the one
  // live topic. The fix filters in JS, so the values the DO actually hands back
  // have to be the ones under test.
  it.each([
    ['stored false', false],
    ['stored 0', 0],
  ])('scans an unpaused topic when paused reads back as %s', async (_label, paused) => {
    const { env } = harness([
      topic({ recordId: 'live', paused: paused as unknown as boolean, nextDueAt: NOW - DAY }),
    ])

    await runDueScans(env)

    expect(scannedTopicIds()).toEqual(['live'])
  })

  it.each([
    ['stored true', true],
    ['stored 1', 1],
  ])('never scans a paused topic when paused reads back as %s', async (_label, paused) => {
    const { env, updates } = harness([
      topic({ recordId: 'off', paused: paused as unknown as boolean, nextDueAt: NOW - 60 * DAY }),
    ])

    await runDueScans(env)

    expect(scannedTopicIds()).toEqual([])
    expect(updates).toEqual([])
  })

  it('does not ask the DO to filter on the boolean it cannot bind', async () => {
    const { env, queries } = harness([topic({ nextDueAt: NOW + DAY })])

    await runDueScans(env)

    for (const opts of queries) {
      expect((opts as { where?: Record<string, unknown> } | undefined)?.where).toBeUndefined()
    }
  })

  it('treats a topic with no nextDueAt as due', async () => {
    const { env } = harness([
      topic({ recordId: 'fresh', nextDueAt: undefined as unknown as number, lastScanAt: 0 }),
    ])

    await runDueScans(env)

    expect(scannedTopicIds()).toEqual(['fresh'])
  })
})

describe('computeNextDueAt — always lands in the future', () => {
  // This is the property that makes a backlog collapse instead of replay. If
  // any input could return an instant at or before `now`, the topic would stay
  // due and the tick would bill it again an hour later, forever.
  it.each([1, 2, 3])('returns a future slot for scansPerDay=%i, unanchored', (scansPerDay) => {
    for (const daysBack of [0, 1, 7, 60, 400]) {
      const now = NOW
      expect(computeNextDueAt(now, scansPerDay, null)).toBeGreaterThan(now)
      // and from the perspective of a run that started `daysBack` late
      expect(computeNextDueAt(now + daysBack * DAY, scansPerDay, null)).toBeGreaterThan(
        now + daysBack * DAY,
      )
    }
  })

  it.each(['00:00', '07:00', '23:59'])('returns a future slot anchored at %s', (timeOfDay) => {
    for (const scansPerDay of [1, 2, 3]) {
      expect(computeNextDueAt(NOW, scansPerDay, timeOfDay)).toBeGreaterThan(NOW)
    }
  })

  it('keeps an anchored daily topic on its wall-clock time', () => {
    const next = computeNextDueAt(Date.parse('2026-08-20T03:31:00Z'), 1, '07:00')
    expect(new Date(next).toISOString()).toBe('2026-08-20T07:00:00.000Z')
  })

  // A stale row does not drag the cadence: the slot is computed from now, so a
  // topic two months behind lands on the next real slot, not on the one after
  // the missed one.
  it('resyncs an anchored topic to today rather than to the day after the miss', () => {
    const next = computeNextDueAt(Date.parse('2026-08-20T03:31:00Z'), 1, '02:00')
    expect(new Date(next).toISOString()).toBe('2026-08-21T02:00:00.000Z')
  })

  it('tolerates a malformed timeOfDay by falling back to an even interval', () => {
    expect(computeNextDueAt(NOW, 2, '99:99')).toBe(NOW + DAY / 2)
    expect(computeNextDueAt(NOW, 2, 'noon')).toBe(NOW + DAY / 2)
  })
})

describe('the scan kill switch', () => {
  it('starts no scans at all while scanning is paused', async () => {
    const { env, updates } = harness([topic(), topic(), topic()], true)
    await runDueScans(env)
    expect(scannedTopicIds()).toEqual([])
    // Nothing may advance either, or a resume would find every topic overdue.
    expect(updates).toEqual([])
  })

  it('still scans when the switch is off', async () => {
    const { env } = harness([topic()], false)
    await runDueScans(env)
    expect(scannedTopicIds()).toHaveLength(1)
  })
})
