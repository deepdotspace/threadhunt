/**
 * Discovery via the Firecrawl integration (owner-billed through the DeepSpace
 * proxy). Search is per-venue: one `firecrawl/search` with a single `site:`
 * filter per venue per query, which scales cleanly to high limits where the
 * combined OR query collapses. Each hit is mapped back to its Venue by hostname.
 *
 * Firecrawl search returns no post body (scrape is blocked on Reddit and a
 * no-op on search), so the excerpt is the Google snippet (`description`).
 * `firecrawl/search` returns `{ data: { data: [{ url, metadata }] } }`; the
 * proxy may hand back the inner object or the array, so we locate it defensively.
 */

import { VENUE_DOMAINS } from '../config'
import type { Venue } from '../types'
import type { RawResult } from './engine-types'

type IntegrationCall = (endpoint: string, params?: Record<string, unknown>) => Promise<unknown>

export interface SearchVenueOpts {
  query: string
  venue: Venue
  resultsPerQuery: number
  recencyDays: number // 0 = any time; otherwise restrict via Google's after:
}

/** Google's after:YYYY-MM-DD operator (works through Firecrawl). */
function afterOperator(recencyDays: number): string {
  if (recencyDays <= 0) return ''
  const d = new Date(Date.now() - recencyDays * 24 * 60 * 60 * 1000)
  return ` after:${d.toISOString().slice(0, 10)}`
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

/** Find the results array regardless of how the proxy wrapped it. */
function extractResults(res: unknown): Array<Record<string, unknown>> | null {
  if (!res || typeof res !== 'object') return null
  const obj = res as Record<string, unknown>
  if ('success' in obj && obj.success === false) return null
  const inner = obj.data as Record<string, unknown> | unknown[] | undefined
  const candidates: unknown[] = [
    obj.data, // proxy unwrapped → data is the array
    Array.isArray(inner) ? inner : (inner as Record<string, unknown> | undefined)?.data,
    obj.results,
  ]
  for (const c of candidates) {
    if (Array.isArray(c)) return c as Array<Record<string, unknown>>
  }
  return null
}

/** Bare hostname of a url, or '' if unparseable. */
function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Map a url's hostname back to one of the enabled venues, or null. */
function venueForUrl(url: string, venues: Venue[]): Venue | null {
  const host = hostnameOf(url)
  if (!host) return null
  for (const v of venues) {
    const domain = VENUE_DOMAINS[v]
    if (host === domain || host.endsWith(`.${domain}`)) return v
  }
  return null
}

/** Best-effort subsection label (subreddit, HN, or the site name). */
function subsectionFor(url: string, venue: Venue): string {
  if (venue === 'reddit') {
    const m = url.match(/reddit\.com\/r\/([^/?#]+)/i)
    return m ? `r/${m[1]}` : 'reddit'
  }
  if (venue === 'hackernews') return 'Hacker News'
  if (venue === 'indiehackers') return 'Indie Hackers'
  if (venue === 'devto') return 'Dev.to'
  if (venue === 'x') return 'X'
  return ''
}

/** Parse a publishedAt date string to epoch ms, or 0 if absent/bad. */
function publishedToMs(v: unknown): number {
  const s = asString(v)
  if (!s) return 0
  const n = Date.parse(s)
  return Number.isNaN(n) ? 0 : n
}

// One search for ONE venue (per-venue scales cleanly to high limits, unlike the
// combined OR query). search returns no body, so the excerpt is the snippet.
export async function searchVenue(
  call: IntegrationCall,
  opts: SearchVenueOpts,
): Promise<RawResult[]> {
  const venue = opts.venue
  if (!VENUE_DOMAINS[venue]) return []
  const query = `${opts.query} site:${VENUE_DOMAINS[venue]}${afterOperator(opts.recencyDays)}`

  let res: unknown
  try {
    res = await call('firecrawl/search', { query, limit: opts.resultsPerQuery })
  } catch (err) {
    console.error(`[search] firecrawl failed for "${opts.query}" on ${venue}:`, err)
    return []
  }

  const raw = extractResults(res)
  if (!raw) return []

  const out: RawResult[] = []
  for (const r of raw) {
    const meta = (r.metadata as Record<string, unknown>) || {}
    const url = asString(r.url) || asString(meta.sourceURL)
    if (!url) continue
    if (!venueForUrl(url, [venue])) continue // a hit outside this venue; drop it
    const description = asString(r.description) || asString(meta.description)
    out.push({
      url,
      source: venue,
      subsection: subsectionFor(url, venue),
      title: asString(r.title) || asString(meta.title),
      author: asString(r.author) || asString(meta.author),
      excerpt: description,
      highlights: description ? [description] : [],
      publishedAt: publishedToMs(r.publishedDate ?? meta.publishedTime),
    })
  }
  return out
}
