import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from './utils'

/*
 * Reply Radar badge. The default is a soft accent pill; `neutral` is a bg-3 chip.
 * For the History action badges (posted / edited / skipped) use StatusBadge.
 */
const badgeVariants = cva(
  'inline-flex items-center font-ui font-semibold transition-colors',
  {
    variants: {
      variant: {
        accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
        neutral: 'bg-[var(--bg-3)] text-[var(--text-3)]',
        outline: 'border border-[var(--border)] text-[var(--text-2)]',
      },
      size: {
        sm: 'rounded-full px-1.5 py-px text-[10px]',
        md: 'rounded-full px-2.5 py-0.5 text-[11px]',
      },
    },
    defaultVariants: {
      variant: 'accent',
      size: 'md',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

/*
 * History action badge. Fixed 64px width, uppercase 10.5px/700.
 *   posted  -> accent-soft bg + accent text (lime in dark, near-black in light)
 *   edited  -> amber tint bg + amber text (fixed hex, constant across modes)
 *   skipped -> bg-3 + muted text (de-emphasized; the design has no danger color)
 */
type StatusAction = 'posted' | 'edited' | 'skipped'

const STATUS_STYLE: Record<StatusAction, string> = {
  posted: 'bg-[var(--accent-soft)] text-[var(--accent)]',
  edited: 'bg-[var(--status-edited-bg)] text-[var(--status-edited-text)]',
  skipped: 'bg-[var(--bg-3)] text-[var(--text-3)]',
}

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  action: StatusAction
}

function StatusBadge({ action, className, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex w-16 items-center justify-center rounded-md px-2 py-[3px] text-center text-[10.5px] font-bold uppercase tracking-[0.03em]',
        STATUS_STYLE[action],
        className,
      )}
      {...props}
    >
      {action}
    </span>
  )
}

export { Badge, badgeVariants, StatusBadge }
export type { StatusAction }
