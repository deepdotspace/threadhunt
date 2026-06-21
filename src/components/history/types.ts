/*
 * History view-model. A decision record joined to its candidate (thread title,
 * source, url) and its topic (name). Joins fall back gracefully when the
 * candidate or topic record is missing, so an entry always renders.
 */

import type { DecisionAction, Venue } from '../../types'

export interface HistoryEntry {
  id: string
  action: DecisionAction
  /** Thread title from the joined candidate, or a fallback when missing. */
  title: string
  source: Venue
  /** Thread url from the joined candidate, empty when the candidate is gone. */
  url: string
  /** Topic name from the joined topic, or a fallback when missing. */
  topic: string
  /** The posted/edited reply text; empty for skipped entries. */
  finalText: string
  /** Decision createdAt as epoch millis (parsed from the record string). */
  createdAt: number
}

export type GroupBy = 'day' | 'topic'

export type ActionFilter = 'all' | DecisionAction

export type RangeKey = 'all' | 'today' | '7' | '30'

export interface HistoryGroupView {
  /** The sticky label: a day bucket or a topic name. */
  key: string
  count: number
  items: HistoryEntry[]
}
