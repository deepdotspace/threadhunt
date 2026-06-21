import * as React from 'react'

import { cn } from './utils'

/*
 * Reply Radar textarea. Raised bg-2 surface, stronger hairline border, accent
 * border on focus. 14px / 1.5 line-height per the New Topic + reply specs.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex w-full rounded-[var(--radius)] border border-[var(--border-2)] bg-[var(--bg-2)] px-4 py-3 text-[14px] leading-[1.5] text-[var(--text-1)] transition-colors',
          'placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
