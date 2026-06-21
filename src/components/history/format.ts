/*
 * Pure helpers for the History screen: day bucketing, range filtering, the
 * tabular time/meta labels, grouping, and the export serializers. Kept free of
 * React so they are easy to read and reuse.
 */

import { venueLabel } from '../queue/sourceMeta'
import type {
  ActionFilter,
  GroupBy,
  HistoryEntry,
  HistoryGroupView,
  RangeKey,
} from './types'

const DAY = 86_400_000

/** Start of the local day for a timestamp, in epoch millis. */
function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Whole local days between an entry and now (0 = today, 1 = yesterday). */
export function dayOffset(ts: number, now: number = Date.now()): number {
  return Math.round((startOfDay(now) - startOfDay(ts)) / DAY)
}

/** The sticky day-group label: Today / Yesterday / weekday + date. */
export function dayLabel(ts: number, now: number = Date.now()): string {
  const off = dayOffset(ts, now)
  if (off <= 0) return 'Today'
  if (off === 1) return 'Yesterday'
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Right-aligned row time, e.g. "2:40 PM". */
export function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

const RANGE_DAYS: Record<RangeKey, number> = {
  all: Infinity,
  today: 0,
  '7': 7,
  '30': 30,
}

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
]

export function rangeLabel(key: RangeKey): string {
  return RANGE_OPTIONS.find((r) => r.key === key)?.label ?? 'All time'
}

/** Apply the action filter and date range to the entry list. */
export function filterEntries(
  entries: HistoryEntry[],
  action: ActionFilter,
  range: RangeKey,
  now: number = Date.now(),
): HistoryEntry[] {
  const maxDays = RANGE_DAYS[range]
  return entries.filter(
    (e) =>
      (action === 'all' || e.action === action) &&
      dayOffset(e.createdAt, now) <= maxDays,
  )
}

/**
 * Group filtered entries by day or topic. Day groups follow recency; topic
 * groups follow first-seen order. Empty groups are dropped.
 */
export function groupEntries(
  entries: HistoryEntry[],
  groupBy: GroupBy,
  now: number = Date.now(),
): HistoryGroupView[] {
  const buckets = new Map<string, HistoryEntry[]>()
  for (const e of entries) {
    const key = groupBy === 'day' ? dayLabel(e.createdAt, now) : e.topic
    const arr = buckets.get(key)
    if (arr) arr.push(e)
    else buckets.set(key, [e])
  }
  return Array.from(buckets, ([key, items]) => ({
    key,
    count: items.length,
    items,
  }))
}

const CSV_HEADERS = ['action', 'title', 'source', 'topic', 'date', 'reply', 'url']

/** Quote a CSV cell, doubling embedded quotes. */
function csvCell(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

/** Build CSV text from the currently filtered+ranged entries. */
export function toCsv(entries: HistoryEntry[]): string {
  const rows = entries.map((e) =>
    [
      e.action,
      e.title,
      venueLabel(e.source),
      e.topic,
      new Date(e.createdAt).toISOString(),
      e.finalText,
      e.url,
    ]
      .map(csvCell)
      .join(','),
  )
  return [CSV_HEADERS.join(','), ...rows].join('\n')
}

/** Build pretty JSON text from the currently filtered+ranged entries. */
export function toJson(entries: HistoryEntry[]): string {
  return JSON.stringify(
    entries.map((e) => ({
      action: e.action,
      title: e.title,
      source: venueLabel(e.source),
      topic: e.topic,
      date: new Date(e.createdAt).toISOString(),
      reply: e.finalText,
      url: e.url,
    })),
    null,
    2,
  )
}

/** Plain-text clipboard form: one block per entry. */
export function toClipboardText(entries: HistoryEntry[]): string {
  return entries
    .map((e) => {
      const head = `[${e.action.toUpperCase()}] ${e.title} (${venueLabel(e.source)} · ${e.topic})`
      const when = new Date(e.createdAt).toLocaleString()
      const body = e.finalText ? `\n${e.finalText}` : ''
      return `${head}\n${when}${body}`
    })
    .join('\n\n')
}
