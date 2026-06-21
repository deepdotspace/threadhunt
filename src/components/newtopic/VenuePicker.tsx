import { Check } from 'lucide-react'

import { SourceChip, cn } from '../ui'
import type { Venue } from '../../types'
import { VENUE_OPTIONS } from './venues'

/*
 * Where-to-look toggles. Each venue is a button with a source chip, the
 * label, and a 16px check square. On = accent-soft fill + accent border + a
 * filled accent check; off = bg-2 surface + empty box.
 */
interface VenuePickerProps {
  selected: Venue[]
  onToggle: (venue: Venue) => void
}

export function VenuePicker({ selected, onToggle }: VenuePickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {VENUE_OPTIONS.map(({ venue, source, label, note }) => {
        const on = selected.includes(venue)
        return (
          <button
            key={venue}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => onToggle(venue)}
            className={cn(
              'inline-flex items-center gap-[9px] rounded-[var(--radius)] border px-[14px] py-[9px] text-[13px] font-semibold transition-all duration-150',
              on
                ? 'border-accent bg-accent-soft text-text-1'
                : 'border-border bg-bg-2 text-text-2 hover:bg-bg-3',
            )}
          >
            <SourceChip source={source} size="sm" />
            {label}
            {note && <span className="text-[10px] font-normal text-text-3">{note}</span>}
            <span
              className={cn(
                'grid h-4 w-4 place-content-center rounded-[3px] border',
                on ? 'border-accent bg-accent text-accent-text' : 'border-border-2',
              )}
            >
              {on && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
