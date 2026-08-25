import { describe, it, expect } from 'vitest'
import { scanTick, emptyStats, buildPairs, type ScanState } from './engine'
import { FUNNEL } from '../config'
import type { TopicData } from '../types'

/**
 * Cost guards. Every search in a scan is a billed provider call, so these two
 * properties are about money, not correctness: a provider outage must not be
 * bought pair by pair, and no single scan may exceed the per-scan ceiling.
 */

function topic(overrides: Partial<TopicData> = {}) {
  return {
    recordId: 'topic_1',
    data: {
      name: 't',
      q1Find: 'find',
      q2Promote: 'promote',
      queries: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'],
      venues: ['reddit', 'hackernews', 'x', 'indiehackers', 'devto'],
      scansPerDay: 1,
      timeOfDay: null,
      draftMode: 'manual',
      replyVoice: '',
      paused: false,
      nextDueAt: 0,
      lastScanAt: 0,
      ownerUserId: 'user_1',
    } as TopicData,
    ...overrides,
  }
}

/** A context whose searches always fail, counting how many were bought. */
function failingCtx() {
  const calls: string[] = []
  return {
    calls,
    ctx: {
      records: { query: async () => [], create: async () => ({}), update: async () => ({}), delete: async () => ({}) },
      integrations: {
        call: async (endpoint: string) => {
          calls.push(endpoint)
          throw new Error('Integration call firecrawl/search failed: Firecrawl API error 402')
        },
      },
      ownerUserId: 'owner',
    },
  }
}

function freshState(): ScanState {
  return { stage: 'search', cursor: 0, queue: [], judged: 0, stats: emptyStats() }
}

describe('searchTick cost guards', () => {
  it('stops buying searches once the provider is consistently failing', async () => {
    const { ctx, calls } = failingCtx()
    let state = freshState()
    // Drive to completion the way the job does, with a hard loop bound so a
    // regression fails as a wrong number rather than hanging the suite.
    for (let i = 0; i < 20 && state.stage === 'search'; i++) {
      const r = await scanTick({} as never, ctx as never, { topic: topic(), recencyDays: 14, state })
      state = r.state
    }
    expect(calls.length).toBe(FUNNEL.abortScanAfterFailedSearches)
    expect(state.stage).toBe('judge')
  })

  it('never buys more searches in one scan than the per-scan ceiling', async () => {
    const calls: string[] = []
    const ctx = {
      records: { query: async () => [], create: async () => ({}), update: async () => ({}), delete: async () => ({}) },
      integrations: {
        call: async (endpoint: string) => {
          calls.push(endpoint)
          return { data: [] } // a clean, empty success: never trips the breaker
        },
      },
      ownerUserId: 'owner',
    }
    let state = freshState()
    for (let i = 0; i < 20 && state.stage === 'search'; i++) {
      const r = await scanTick({} as never, ctx as never, { topic: topic(), recencyDays: 14, state })
      state = r.state
    }
    // 8 queries x 5 venues = 40 pairs, which the ceiling must clamp.
    expect(buildPairs(topic().data).length).toBe(40)
    expect(calls.length).toBe(FUNNEL.maxSearchesPerScan)
  })
})
