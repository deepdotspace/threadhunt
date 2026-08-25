/**
 * Scan loop runner. Bridges the cron tick and the manual trigger to the scan
 * background job. Both paths enqueue a 'scan' job and return; the job stamps
 * lastScanAt itself. The runner only enqueues and (for the cron path) advances
 * each topic's nextDueAt to the next slot.
 */

import { enqueueJob } from 'deepspace/worker'
import type { CronContext } from 'deepspace/worker'
import { FUNNEL } from '../config'
import type { TopicData } from '../types'
import type { Env } from '../../worker'
import { computeNextDueAt } from './schedule'
import { ownerContext, scansPaused } from './ops'

type Envelope<T> = { recordId: string; data: T }

/** Schedule the next run for a topic from its cadence and preferred time. */
async function advanceSchedule(
  ctx: CronContext,
  topic: Envelope<TopicData>,
  now: number,
  lastScanAt: number | null,
): Promise<void> {
  const nextDueAt = computeNextDueAt(now, topic.data.scansPerDay, topic.data.timeOfDay)
  const patch: Record<string, unknown> = { nextDueAt }
  if (lastScanAt !== null) patch.lastScanAt = lastScanAt
  await ctx.records.update('topics', topic.recordId, patch)
}

/**
 * Enqueue a scan job for one topic. The window is wide on the first run and
 * tight afterwards. The job stamps lastScanAt.
 */
export async function enqueueScan(env: Env, topic: Envelope<TopicData>): Promise<string> {
  const recencyDays =
    topic.data.lastScanAt > 0 ? FUNNEL.recencyDaysOngoing : FUNNEL.recencyDaysFirstRun
  return enqueueJob(
    env.JOB_ROOMS,
    `app:${env.APP_NAME}`,
    'scan',
    { topicId: topic.recordId, recencyDays },
    { maxAttempts: 1, enqueuedBy: topic.data.ownerUserId },
  )
}

/**
 * Cron tick. Enqueue a scan job for every non-paused topic whose nextDueAt has
 * passed, capped per tick, then advance the schedule (lastScanAt unset; the job
 * stamps it). One topic's failure never kills the rest of the tick.
 *
 * Every scan is owner-billed Exa/Firecrawl search plus Haiku judging, so two
 * properties matter more than anything else here and are pinned in runner.test.ts:
 *
 *  - A topic that is months overdue produces ONE scan, not one per missed slot.
 *    advanceSchedule computes the next slot from `now` rather than from the slot
 *    it just fired, so a backlog collapses to a single catch-up run and then
 *    resyncs to the present. Missed scans are missed; nobody wants sixty
 *    re-runs of the same queries.
 *  - A tick can start at most FUNNEL.maxTopicsPerTick scans however many topics
 *    are due, so a pile of overdue topics drains at one an hour instead of all
 *    at once.
 */
export async function runDueScans(env: Env): Promise<void> {
  const ctx = ownerContext(env)

  // The kill switch. Scans are the only thing in this app that spends money,
  // so the owner gets to stop them from outside without waiting for a deploy.
  if (await scansPaused(ctx)) {
    console.warn('[runner] scans are paused; skipping this tick')
    return
  }

  const now = Date.now()

  // Read every topic and drop the paused ones here, not in the query.
  //
  // `paused` is a boolean-INTERPRETED number column, so the DO stores 0/1 and
  // hands 0/1 back, and RecordRoom binds a `where` value straight into the SQL
  // with no coercion. `where: { paused: false }` therefore compares the column
  // against a bound JS boolean and matches nothing at all — which meant this
  // tick would have found no work ever, however overdue the topics were.
  // Confirmed against production on 2026-08-20: `where: { paused: false }`
  // returns 0 rows for the one live topic, `where: { paused: 0 }` returns it.
  // A plain truthiness check reads correctly for 0, 1, false, true and a
  // missing column alike, and cannot rot if the column's storage changes.
  const topics = (await ctx.records.query('topics')) as Envelope<TopicData>[]
  const due = topics
    .filter((t) => !t.data.paused && (t.data.nextDueAt ?? 0) <= now)
    .slice(0, FUNNEL.maxTopicsPerTick)

  for (const topic of due) {
    try {
      await enqueueScan(env, topic)
      // Move only nextDueAt; the job stamps lastScanAt when it runs.
      await advanceSchedule(ctx, topic, now, null)
    } catch (err) {
      console.error(`[runner] tick error for topic ${topic.recordId}:`, err)
    }
  }
}

/**
 * Manual scan trigger. Scopes to the caller's topics, finds the requested one,
 * and enqueues a scan job. Returns the jobId.
 */
export async function enqueueScanNow(
  env: Env,
  ctx: CronContext,
  topicId: string,
  userId: string,
): Promise<string> {
  // Scope the query to the caller's topics, then match the id. A topic the
  // caller does not own is simply absent, which reads as a not-found error.
  const rows = (await ctx.records.query('topics', {
    where: { ownerUserId: userId },
  })) as Envelope<TopicData>[]
  const topic = rows.find((t) => t.recordId === topicId)
  if (!topic) throw new Error('Topic not found or not yours.')

  return enqueueScan(env, topic)
}
