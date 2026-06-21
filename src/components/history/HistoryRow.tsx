/*
 * One History row. Collapsed: action badge, source chip,
 * thread title, a meta column (topic or day), a tabular time, and a chevron.
 * Expanded: posted/edited rows show the reply in an accent-quoted block with
 * Copy/Open actions; skipped rows show a dashed "no reply was sent" note.
 */

import { StatusBadge, SourceChip } from '../ui'
import { venueLabel, venueToSource } from '../queue/sourceMeta'
import { timeLabel } from './format'
import type { HistoryEntry } from './types'

interface HistoryRowProps {
  entry: HistoryEntry
  /** What the meta column reads: the topic (Day grouping) or day (Topic grouping). */
  meta: string
  open: boolean
  onToggle: () => void
  onCopy: () => void
}

export function HistoryRow({ entry, meta, open, onToggle, onCopy }: HistoryRowProps) {
  const hasReply = entry.action !== 'skipped'
  const statusNote =
    entry.action === 'posted'
      ? `Posted to ${venueLabel(entry.source)}`
      : entry.action === 'edited'
        ? 'Saved draft, not posted yet'
        : ''

  return (
    <div
      className="border-b border-border last:border-b-0"
      style={{ background: open ? 'var(--bg-3)' : 'transparent' }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-[13px] px-4 py-3 text-left transition-colors hover:bg-bg-3"
      >
        <StatusBadge action={entry.action} />
        <SourceChip source={venueToSource(entry.source)} size="sm" />
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-text-1">
          {entry.title}
        </span>
        <span className="shrink-0 whitespace-nowrap text-[11.5px] text-text-3">
          {meta}
        </span>
        <span className="tnum w-14 shrink-0 text-right text-[11.5px] text-text-3">
          {timeLabel(entry.createdAt)}
        </span>
        <span
          className="w-4 shrink-0 text-center text-[12px] text-text-3 transition-transform duration-[180ms] motion-reduce:transition-none"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden
        >
          ⌄
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0.5 animate-rs-in motion-reduce:animate-none">
          {hasReply ? (
            <div className="rounded-[var(--radius)] border border-border bg-bg-1 p-[13px_15px]">
              <div className="mb-[9px] flex items-center gap-[9px]">
                <span className="text-[10px] font-bold uppercase tracking-[var(--label-spacing)] text-text-3">
                  Your reply
                </span>
                <span className="tnum text-[11px] text-text-3">
                  {entry.finalText.length} chars
                </span>
                <div className="flex-1" />
                <span className="text-[11px] text-text-3">{statusNote}</span>
              </div>
              <div
                className="rounded-[calc(var(--radius)-3px)] border border-border border-l-2 border-l-accent bg-bg-2 p-[12px_14px] text-[13.5px] leading-[1.6] text-text-2"
                style={{ textWrap: 'pretty' }}
              >
                {entry.finalText}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCopy}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-[calc(var(--radius)-2px)] border border-border bg-bg-1 px-3 py-[7px] text-[12px] font-semibold text-text-2 transition-colors hover:bg-bg-3 hover:text-text-1"
                >
                  Copy reply
                </button>
                <a
                  href={entry.url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-1.5 py-[7px] text-[12px] text-text-3 transition-colors hover:text-accent"
                >
                  Open thread ↗
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-[var(--radius)] border border-dashed border-border-2 bg-bg-1 p-[13px_15px]">
              <span className="text-[13px] text-text-3">
                Skipped from the queue. No reply was sent.
              </span>
              <div className="flex-1" />
              <a
                href={entry.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-text-3 transition-colors hover:text-accent"
              >
                Open thread ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
