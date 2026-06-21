/**
 * Scan engine. The per-topic discovery pipeline (SPEC section 7), driven one
 * chunk at a time by the scan background job. Runs as the topic owner via a
 * cron context. Search is per-venue and recency-bounded; new urls are deduped
 * against seen + the in-flight queue, judged in batches, ALWAYS recorded in
 * seen_urls so they are never judged twice, and survivors queued as candidates.
 * In auto draft mode it also writes a Sonnet draft. Writes seen_urls +
 * candidates.
 *
 * The seen set and few-shot examples are loaded ONCE per chunk (not per result)
 * to stay under the Worker subrequest limit.
 */

import type { CronContext } from 'deepspace/worker'
import { FUNNEL, DEFAULTS } from '../config'
import type { CandidateData, DecisionData, SeenUrlData, TopicData, Venue } from '../types'
import type { Env } from '../../worker'
import { searchVenue } from './search'
import { judgeBatch } from './judge'
import { draftReply } from './draft'
import type { RawResult, ScanStats } from './engine-types'

type Envelope<T> = { recordId: string; data: T; createdAt?: string | number }

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Coerce an envelope createdAt (ISO string or epoch) to milliseconds. */
function toMs(v: string | number | undefined): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const n = Date.parse(v)
  return Number.isNaN(n) ? 0 : n
}

/** Past approved replies for few-shot, newest first, loaded once per topic. */
async function loadFewShot(ctx: CronContext, topicId: string): Promise<string[]> {
  try {
    const decisions = (await ctx.records.query('decisions', {
      where: { topicId },
      limit: 50,
    })) as Envelope<DecisionData>[]
    return decisions
      .filter((d) => (d.data.action === 'posted' || d.data.action === 'edited') && d.data.finalText)
      .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
      .slice(0, 3)
      .map((d) => d.data.finalText)
  } catch (err) {
    console.error(`[scan] few-shot load failed for topic ${topicId}:`, err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Resumable scan. The background job drives `scanTick` one chunk at a time,
// carrying `ScanState` across alarm ticks via ctx.continue. JSON-only.
// ---------------------------------------------------------------------------

/** JSON-serializable progress for one scan: no Set/Map, queue holds raw hits. */
export type ScanState = {
  stage: 'search' | 'judge'
  cursor: number
  queue: RawResult[]
  judged: number
  stats: ScanStats
}

/** A fresh zeroed stats object. */
export function emptyStats(): ScanStats {
  return { searches: 0, found: 0, judged: 0, queued: 0, drafted: 0, skipped: 0, errors: 0, errorSample: '' }
}

/** All (query x venue) pairs to search, query outer and venue inner. */
export function buildPairs(data: TopicData): { query: string; venue: Venue }[] {
  const venues = data.venues?.length ? data.venues : DEFAULTS.venues
  const queries = data.queries.slice(0, FUNNEL.queriesPerTopic)
  const pairs: { query: string; venue: Venue }[] = []
  for (const query of queries) for (const venue of venues) pairs.push({ query, venue })
  return pairs
}

/** Every url already seen for this topic, loaded once per search chunk. */
export async function loadSeenUrls(ctx: CronContext, topicId: string): Promise<string[]> {
  const rows = (await ctx.records.query('seen_urls', {
    where: { topicId },
    limit: 10000,
  })) as Envelope<SeenUrlData>[]
  return rows.map((s) => s.data.url)
}

/** Record the first error and count it without aborting the tick. */
function noteError(stats: ScanStats, err: unknown): void {
  stats.errors++
  if (!stats.errorSample) stats.errorSample = errMsg(err)
}

/** One search chunk: advance the cursor, dedup hits, append to the queue. */
async function searchTick(
  ctx: CronContext,
  topic: Envelope<TopicData>,
  recencyDays: number,
  state: ScanState,
): Promise<void> {
  const pairs = buildPairs(topic.data)
  const seen = new Set(await loadSeenUrls(ctx, topic.recordId))
  const queueUrls = new Set(state.queue.map((t) => t.url))
  const budget = FUNNEL.judgeBudgetPerScan

  let done = 0
  while (done < FUNNEL.searchesPerChunk && state.cursor < pairs.length) {
    if (state.queue.length >= budget) break
    const { query, venue } = pairs[state.cursor]
    try {
      const hits = await searchVenue(ctx.integrations.call, {
        query,
        venue,
        resultsPerQuery: FUNNEL.resultsPerVenueQuery,
        recencyDays,
      })
      state.stats.searches++
      state.stats.found += hits.length
      for (const hit of hits) {
        if (!hit.url || seen.has(hit.url) || queueUrls.has(hit.url)) {
          state.stats.skipped++
          continue
        }
        queueUrls.add(hit.url)
        state.queue.push(hit)
      }
    } catch (err) {
      noteError(state.stats, err)
      console.error(`[scan] search "${query}" on ${venue} failed:`, err)
    }
    state.cursor++
    done++
  }

  if (state.cursor >= pairs.length || state.queue.length >= budget) state.stage = 'judge'
}

/** One judge chunk: judge a slice, write seen_urls + candidates, draft in auto. */
async function judgeTick(
  env: Env,
  ctx: CronContext,
  topic: Envelope<TopicData>,
  state: ScanState,
): Promise<boolean> {
  const slice = state.queue.splice(0, FUNNEL.judgeThreadsPerChunk)
  if (slice.length === 0) return true

  const data = topic.data
  const topicId = topic.recordId
  const examples = data.draftMode === 'auto' ? await loadFewShot(ctx, topicId) : []

  for (let i = 0; i < slice.length; i += FUNNEL.judgeBatchSize) {
    const batch = slice.slice(i, i + FUNNEL.judgeBatchSize)
    let verdicts
    try {
      verdicts = await judgeBatch(env, { q1Find: data.q1Find, q2Promote: data.q2Promote, threads: batch })
    } catch (err) {
      noteError(state.stats, err)
      console.error(`[scan] judge batch failed for topic ${topicId}:`, err)
      continue
    }
    for (let j = 0; j < batch.length; j++) {
      const thread = batch[j]
      const verdict = verdicts[j]
      try {
        state.stats.judged++
        // ALWAYS record the url so it is never judged again, even when rejected.
        const seenRow: SeenUrlData = { topicId, url: thread.url, judgedAt: Date.now() }
        await ctx.records.create('seen_urls', seenRow as unknown as Record<string, unknown>)
        if (verdict.score < FUNNEL.scoreThreshold) continue

        let draftText = ''
        if (data.draftMode === 'auto') {
          try {
            draftText = await draftReply(env, {
              q2Promote: data.q2Promote,
              replyVoice: data.replyVoice,
              thread,
              examples,
              model: data.draftModel ?? 'sonnet',
            })
            state.stats.drafted++
          } catch (err) {
            console.error(`[scan] draft failed for ${thread.url}:`, err)
          }
        }

        const candidate: CandidateData = {
          topicId,
          url: thread.url,
          source: thread.source,
          subsection: thread.subsection,
          title: thread.title,
          author: thread.author,
          excerpt: thread.excerpt,
          highlights: thread.highlights,
          publishedAt: thread.publishedAt,
          score: verdict.score,
          reason: verdict.reason,
          type: verdict.type,
          draftText,
          status: 'queued',
          ownerUserId: data.ownerUserId,
        }
        await ctx.records.create('candidates', candidate as unknown as Record<string, unknown>)
        state.stats.queued++
      } catch (err) {
        noteError(state.stats, err)
        console.error(`[scan] result ${thread.url} failed:`, err)
      }
    }
  }

  state.judged += slice.length
  return state.queue.length === 0 || state.judged >= FUNNEL.judgeBudgetPerScan
}

/**
 * Run ONE chunk of a scan. In the search stage it gathers and dedups hits into
 * the queue; once pairs are exhausted or the queue hits the budget it flips to
 * the judge stage, which judges + persists a slice per call. `done` is true
 * only when judging has drained the queue or reached the budget.
 */
export async function scanTick(
  env: Env,
  ctx: CronContext,
  args: { topic: Envelope<TopicData>; recencyDays: number; state: ScanState },
): Promise<{ state: ScanState; done: boolean }> {
  const { topic, recencyDays, state } = args
  if (state.stage === 'search') {
    await searchTick(ctx, topic, recencyDays, state)
    return { state, done: false } // judging always remains
  }
  const done = await judgeTick(env, ctx, topic, state)
  return { state, done }
}
