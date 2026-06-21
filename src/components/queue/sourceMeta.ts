/*
 * Small formatters the queue list and detail panes reuse (relative age,
 * match-bar fill, next-scan label). The venue<->source bridge lives in
 * src/lib/sources.ts; re-exported here so existing queue call sites are
 * unchanged.
 */

export { venueToSource, venueLabel } from '../../lib/sources'

/** Map a 0-10 judge score to a 0-100 percent for the match indicator. */
export function scoreToPercent(score: number): number {
  return Math.round(score * 10)
}

/** Match-bar fill count from a percent. >=85 -> 3, >=75 -> 2, else 1. */
export function matchBarsForPercent(pct: number): 1 | 2 | 3 {
  if (pct >= 85) return 3
  if (pct >= 75) return 2
  return 1
}

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** Compact relative age, e.g. "3h", "2d", "5m". "now" under a minute. */
export function relativeAge(ts: number, now: number = Date.now()): string {
  if (!ts || ts <= 0) return ''
  const diff = Math.max(0, now - ts)
  if (diff < MIN) return 'now'
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`
  return `${Math.floor(diff / DAY)}d`
}

/** Friendly "next scan" label for the queue header from a due timestamp. */
export function nextScanLabel(nextDueAt: number, now: number = Date.now()): string {
  if (!nextDueAt || nextDueAt <= 0) return 'not scheduled'
  const diff = nextDueAt - now
  if (diff <= 0) return 'due now'
  if (diff < HOUR) return `in ${Math.max(1, Math.floor(diff / MIN))}m`
  if (diff < DAY) return `in ${Math.floor(diff / HOUR)}h`
  return `in ${Math.floor(diff / DAY)}d`
}

/** First initial for the excerpt OP avatar. Author is often empty for search
 *  results, and the SDK reads empty text columns back as undefined. */
export function authorInitial(author: string | undefined): string {
  const trimmed = (author ?? '').trim()
  return trimmed ? trimmed[0].toUpperCase() : '?'
}
