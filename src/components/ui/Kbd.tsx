import * as React from 'react'

import { cn } from './utils'

/*
 * Keyboard hint — a small bordered box for shortcut keys (e.g. the Skip "X").
 */
function Kbd({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-grid min-w-[18px] place-content-center rounded-[4px] border border-[var(--border-2)] px-1 py-px font-ui text-[10.5px] font-semibold leading-none text-[var(--text-3)]',
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}

export { Kbd }
