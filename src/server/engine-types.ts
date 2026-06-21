/**
 * Engine-only helper types. These are runtime/transport shapes, not stored
 * record shapes, so they live here and not in the data-model src/types.ts.
 */

import type { Venue } from '../types'

/** One discovery hit, mapped back to the venue it came from. */
export interface RawResult {
  url: string
  source: Venue
  subsection: string
  title: string
  author: string
  excerpt: string
  highlights: string[]
  publishedAt: number
}

/** Per-scan diagnostics accumulated across the scan job's chunks. */
export interface ScanStats {
  searches: number // search calls made (query x venue), a cost driver
  found: number // total raw results seen across all queries
  judged: number // urls sent to the judge
  queued: number // candidates created (score >= threshold)
  drafted: number // candidates that also got an auto draft
  skipped: number // urls dropped as already seen
  errors: number // per-query or per-result failures swallowed
  errorSample: string // first error message seen, for diagnostics
}
