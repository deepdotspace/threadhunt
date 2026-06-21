/*
 * One dense list row: source chip + label + age + status
 * hint, a 2-line title, and a bottom meta line with the type dot, subsection,
 * and the match indicator. Selected rows get a bg-sel wash and a lime left rail.
 * Skipping rows fade out and slide left before they leave the list.
 */

import type { RecordData } from 'deepspace'
import type { CandidateData } from '../../types'
import { SourceChip } from '../ui'
import { TYPES } from '../../themes'
import { MatchBars } from './MatchBars'
import { relativeAge, scoreToPercent, venueLabel, venueToSource } from './sourceMeta'

interface QueueRowProps {
  candidate: RecordData<CandidateData>
  selected: boolean
  fading: boolean
  onSelect: () => void
}

export function QueueRow({ candidate, selected, fading, onSelect }: QueueRowProps) {
  const d = candidate.data
  const pct = scoreToPercent(d.score)
  const typeMeta = TYPES.find((t) => t.id === d.type)
  const hasDraft = (d.draftText ?? '').trim().length > 0

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className="relative block w-full cursor-pointer border-b border-border py-[11px] pl-4 pr-[14px] text-left transition-[background,opacity,transform] duration-150 hover:bg-bg-2"
      style={{
        background: selected ? 'var(--bg-sel)' : undefined,
        opacity: fading ? 0 : 1,
        transform: fading ? 'translateX(-12px)' : 'translateX(0)',
        transitionDuration: fading ? '300ms' : undefined,
      }}
    >
      {selected && (
        <span
          className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-accent"
          aria-hidden
        />
      )}

      {/* Top meta row: source + age, status hint right-aligned */}
      <div className="flex items-center gap-2">
        <SourceChip source={venueToSource(d.source)} size="sm" />
        <span className="truncate text-[12px] font-semibold text-text-2">
          {venueLabel(d.source)}
        </span>
        {relativeAge(d.publishedAt) && (
          <span className="shrink-0 text-[11px] text-text-3">· {relativeAge(d.publishedAt)}</span>
        )}
        <span className="ml-auto shrink-0">
          {hasDraft ? (
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-accent">
              <span className="h-[5px] w-[5px] rounded-full bg-accent" aria-hidden />
              Draft ready
            </span>
          ) : (
            <span
              className="block h-[7px] w-[7px] rounded-full bg-accent"
              style={{ boxShadow: '0 0 0 3px var(--accent-soft)' }}
              title="New"
              aria-hidden
            />
          )}
        </span>
      </div>

      {/* Title, clamped to two lines */}
      <div
        className="mt-1.5 text-[13.5px] font-semibold leading-[1.35] text-text-1"
        style={{
          textWrap: 'pretty',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {d.title}
      </div>

      {/* Bottom meta line: type, subsection, match indicator */}
      <div className="mt-1.5 flex items-center gap-2.5 text-[11px] text-text-3">
        {typeMeta && (
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-[2px]" style={{ background: typeMeta.dot }} aria-hidden />
            {typeMeta.label}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{d.subsection}</span>
        <span className="flex shrink-0 items-center gap-1.5 tnum">
          <MatchBars percent={pct} />
          <span className="text-[11px] font-semibold text-text-2">{pct}</span>
        </span>
      </div>
    </button>
  )
}
