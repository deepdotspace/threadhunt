import * as React from 'react'

import { cn } from './utils'

/*
 * Reply Radar text input. Raised bg-2 surface, stronger hairline border, accent
 * border on focus. 14px UI face.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex w-full rounded-[var(--radius)] border border-[var(--border-2)] bg-[var(--bg-2)] px-3 py-2 text-[14px] text-[var(--text-1)] transition-colors',
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
Input.displayName = 'Input'

export { Input }
