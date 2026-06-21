import * as React from 'react'
import { X } from 'lucide-react'

import { cn } from './utils'

/*
 * Editable query chip (New Topic). A pill with the query text and a round
 * remove button. 20px radius, bg-1 surface, stronger hairline border.
 */
export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  onRemove?: () => void
  removeLabel?: string
}

function Chip({ children, onRemove, removeLabel = 'Remove', className, ...props }: ChipProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[20px] border border-[var(--border-2)] bg-[var(--bg-1)] py-1.5 pl-3 pr-2 text-[12.5px] text-[var(--text-1)]',
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="grid h-[17px] w-[17px] shrink-0 place-content-center rounded-full text-[var(--text-3)] transition-colors hover:bg-[var(--bg-3)] hover:text-[var(--text-1)]"
        >
          <X className="h-3 w-3" strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

export { Chip }
