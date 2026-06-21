import { cn } from '../ui'

/*
 * Reply Radar segmented control. bg-2 track, the active button
 * lifts to bg-1; inactive buttons read muted.
 */
export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex w-fit gap-[3px] rounded-[var(--radius)] border border-border bg-bg-2 p-[3px]"
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-[calc(var(--radius)-2px)] px-[12px] py-[6px] text-[12px] font-semibold transition-all duration-150',
              active ? 'bg-bg-1 text-text-1' : 'bg-transparent text-text-3 hover:text-text-2',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
