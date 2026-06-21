/*
 * List-pane toolbar: a source filter (All + the venues
 * present in the list, each pill with a color dot) over a segmented type filter
 * (All / Question / Discussion / Pain point) and a sort control (Best match /
 * Newest) paired with a live "N to review" count. The page controls all three;
 * this component is presentation only.
 */

import type { Venue, ConversationType } from '../../types'
import { srcVar } from '../../themes'
import { venueLabel, venueToSource } from './sourceMeta'

export type SourceFilter = 'all' | Venue
export type TypeFilter = 'all' | ConversationType
export type SortKey = 'best' | 'newest'

const TYPE_OPTIONS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'question', label: 'Question' },
  { id: 'discussion', label: 'Discussion' },
  { id: 'painpoint', label: 'Pain point' },
]

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'best', label: 'Best match' },
  { id: 'newest', label: 'Newest' },
]

interface QueueToolbarProps {
  /** Venues present in the unfiltered list, in a stable order. */
  venues: Venue[]
  sourceFilter: SourceFilter
  typeFilter: TypeFilter
  sort: SortKey
  count: number
  onSourceFilter: (f: SourceFilter) => void
  onTypeFilter: (f: TypeFilter) => void
  onSort: (s: SortKey) => void
}

export function QueueToolbar({
  venues,
  sourceFilter,
  typeFilter,
  sort,
  count,
  onSourceFilter,
  onTypeFilter,
  onSort,
}: QueueToolbarProps) {
  return (
    <div className="flex-none border-b border-border px-[14px] py-[11px]">
      {/* Source filter pills */}
      <div className="flex items-center gap-[5px] overflow-x-auto pb-px">
        <SourcePill active={sourceFilter === 'all'} label="All" onClick={() => onSourceFilter('all')} />
        {venues.map((v) => (
          <SourcePill
            key={v}
            active={sourceFilter === v}
            label={venueLabel(v)}
            dot={srcVar(venueToSource(v))}
            onClick={() => onSourceFilter(v)}
          />
        ))}
      </div>

      {/* Type segmented control */}
      <div className="mt-2.5 flex items-center gap-2.5">
        <div className="flex items-center gap-[3px] rounded-[var(--radius)] border border-border bg-bg-2 p-0.5">
          {TYPE_OPTIONS.map((opt) => {
            const active = typeFilter === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onTypeFilter(opt.id)}
                aria-pressed={active}
                className="rounded-[4px] px-[9px] py-1 text-[11.5px] font-semibold transition-colors"
                style={{
                  background: active ? 'var(--bg-1)' : 'transparent',
                  color: active ? 'var(--text-1)' : 'var(--text-3)',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sort segmented control + count */}
      <div className="mt-2 flex items-center gap-2.5">
        <div className="flex items-center gap-[3px] rounded-[var(--radius)] border border-border bg-bg-2 p-0.5">
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSort(opt.id)}
                aria-pressed={active}
                className="rounded-[4px] px-[9px] py-1 text-[11.5px] font-semibold transition-colors"
                style={{
                  background: active ? 'var(--bg-1)' : 'transparent',
                  color: active ? 'var(--text-1)' : 'var(--text-3)',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <span className="ml-auto shrink-0 text-[11px] text-text-3 tnum">
          <span className="font-bold text-text-1">{count}</span> to review
        </span>
      </div>
    </div>
  )
}

function SourcePill({
  active,
  label,
  dot,
  onClick,
}: {
  active: boolean
  label: string
  dot?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex shrink-0 items-center gap-1.5 rounded-[20px] border px-[11px] py-[5px] text-[12px] font-semibold transition-colors"
      style={
        active
          ? { background: 'var(--accent-soft)', borderColor: 'var(--accent)', color: 'var(--text-1)' }
          : { background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text-2)' }
      }
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} aria-hidden />}
      {label}
    </button>
  )
}
