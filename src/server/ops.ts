/**
 * Ops surface: the scan kill switch and a cost-triage view.
 *
 * A scan issues one billed `firecrawl/search` per (query x venue) pair, so a
 * single topic can cost tens of dollars per run and the app has no other way
 * to show that. This module answers "who is spending what" and lets the owner
 * stop scanning without a deploy.
 *
 * It runs as the app owner, which bypasses RBAC, so it deliberately reports
 * only what cost triage needs. Topic rows carry names and tunables; the users'
 * q1Find / q2Promote strategy text is never returned.
 */

import { buildCronContext } from 'deepspace/worker'
import type { CronContext } from 'deepspace/worker'
import type { Env } from '../../worker'
import { FUNNEL, DEFAULTS, SEARCH_COST_USD } from '../config'
import type { TopicData } from '../types'

type Envelope<T> = { recordId: string; data: T }

const PAUSE_KEY = 'scansPaused'

/** Owner context, bound to the app's shared RecordRoom. */
export function ownerContext(env: Env): CronContext {
  return buildCronContext(env, env.OWNER_USER_ID, `app:${env.APP_NAME}`)
}

/** The settings row holding the kill switch, if it has ever been written. */
async function pauseRow(ctx: CronContext): Promise<Envelope<{ key: string; value: string }> | null> {
  const rows = (await ctx.records.query('settings', {
    where: { key: PAUSE_KEY },
    limit: 10,
  })) as Envelope<{ key: string; value: string }>[]
  return rows.find((r) => r.data.key === PAUSE_KEY) ?? null
}

/**
 * Is scanning paused? Defaults to false, so a fresh install scans normally and
 * only an explicit pause stops it. A read failure returns false rather than
 * wedging the cron on a transient error.
 */
export async function scansPaused(ctx: CronContext): Promise<boolean> {
  try {
    return (await pauseRow(ctx))?.data.value === 'true'
  } catch (err) {
    console.error('[ops] could not read the pause switch; assuming not paused:', err)
    return false
  }
}

/** Flip the kill switch. Creates the settings row the first time. */
export async function setScansPaused(ctx: CronContext, paused: boolean): Promise<void> {
  const value = paused ? 'true' : 'false'
  const row = await pauseRow(ctx)
  if (row) await ctx.records.update('settings', row.recordId, { value })
  else await ctx.records.create('settings', { key: PAUSE_KEY, value })
}

/** How many searches one scan of this topic buys, after the per-scan cap. */
function searchesPerScan(data: TopicData): number {
  const venues = data.venues?.length ? data.venues.length : DEFAULTS.venues.length
  const queries = Math.min(data.queries?.length ?? 0, FUNNEL.queriesPerTopic)
  return Math.min(queries * venues, FUNNEL.maxSearchesPerScan)
}

export type OpsTopic = {
  topicId: string
  name: string
  ownerUserId: string
  venues: string[]
  queries: number
  scansPerDay: number
  paused: boolean
  lastScanAt: number
  nextDueAt: number
  searchesPerScan: number
  usdPerScan: number
  usdPerDay: number
}

/**
 * Everything needed to triage spend: who the users are, what they scan, and
 * what that costs per day at the current settings.
 */
export async function opsSummary(env: Env, ctx: CronContext) {
  const [users, topics, candidates] = await Promise.all([
    ctx.records.query('users', { limit: 1000 }) as Promise<Envelope<Record<string, unknown>>[]>,
    ctx.records.query('topics', { limit: 1000 }) as Promise<Envelope<TopicData>[]>,
    ctx.records.query('candidates', { limit: 5000 }) as Promise<Envelope<Record<string, unknown>>[]>,
  ])

  const rows: OpsTopic[] = topics.map((t) => {
    const searches = searchesPerScan(t.data)
    const perScan = searches * SEARCH_COST_USD
    const scansPerDay = Math.max(1, Math.floor(t.data.scansPerDay ?? 1))
    return {
      topicId: t.recordId,
      name: t.data.name ?? '',
      ownerUserId: t.data.ownerUserId ?? '',
      venues: t.data.venues?.length ? t.data.venues : [...DEFAULTS.venues],
      queries: t.data.queries?.length ?? 0,
      scansPerDay,
      paused: Boolean(t.data.paused),
      lastScanAt: t.data.lastScanAt ?? 0,
      nextDueAt: t.data.nextDueAt ?? 0,
      searchesPerScan: searches,
      usdPerScan: Number(perScan.toFixed(2)),
      usdPerDay: Number((t.data.paused ? 0 : perScan * scansPerDay).toFixed(2)),
    }
  })

  const active = rows.filter((r) => !r.paused)
  return {
    scansPaused: await scansPaused(ctx),
    searchCostUsd: SEARCH_COST_USD,
    maxSearchesPerScan: FUNNEL.maxSearchesPerScan,
    counts: {
      users: users.length,
      topics: rows.length,
      activeTopics: active.length,
      candidates: candidates.length,
      distinctTopicOwners: new Set(rows.map((r) => r.ownerUserId)).size,
    },
    projected: {
      usdPerDay: Number(active.reduce((n, r) => n + r.usdPerDay, 0).toFixed(2)),
      searchesPerDay: active.reduce((n, r) => n + r.searchesPerScan * r.scansPerDay, 0),
    },
    topics: rows.sort((a, b) => b.usdPerDay - a.usdPerDay),
  }
}
