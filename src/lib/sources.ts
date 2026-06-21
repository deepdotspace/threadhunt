/*
 * The single bridge between the data model and the theme. The data model names
 * venues `hackernews` / `indiehackers` / `devto`; the theme + SourceChip name
 * them `hn` / `ih` / `devto`. Every consumer (queue, new-topic picker, settings
 * picker, history) maps through here so the mapping lives in exactly one place.
 */

import { SOURCES, type SourceId } from '../themes'
import type { Venue } from '../types'

/** Venue (data model) -> SourceId (theme + SourceChip). */
const VENUE_TO_SOURCE: Record<Venue, SourceId> = {
  reddit: 'reddit',
  hackernews: 'hn',
  x: 'x',
  indiehackers: 'ih',
  devto: 'devto',
}

export function venueToSource(venue: Venue): SourceId {
  return VENUE_TO_SOURCE[venue]
}

/** Human label for a venue (e.g. "Hacker News"), via the theme source table. */
export function venueLabel(venue: Venue): string {
  const id = VENUE_TO_SOURCE[venue]
  return SOURCES.find((s) => s.id === id)?.label ?? venue
}

/** Optional notes flagging venue caveats, keyed by venue. */
const VENUE_NOTES: Partial<Record<Venue, string>> = {}

/** Venues in display order, each paired with its source chip metadata. */
export const VENUE_OPTIONS: { venue: Venue; source: SourceId; label: string; note?: string }[] = (
  Object.keys(VENUE_TO_SOURCE) as Venue[]
).map((venue) => {
  const source = VENUE_TO_SOURCE[venue]
  const meta = SOURCES.find((s) => s.id === source)!
  return { venue, source, label: meta.label, note: VENUE_NOTES[venue] }
})
