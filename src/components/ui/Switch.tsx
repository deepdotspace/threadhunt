import * as React from 'react'
import * as SwitchPrimitives from '@radix-ui/react-switch'

import { cn } from './utils'

/*
 * Reply Radar toggle. On = accent track with an on-accent thumb; off = bg-3 track.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-[var(--border)] transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-[var(--accent)] data-[state=checked]:border-[var(--accent)] data-[state=unchecked]:bg-[var(--bg-3)]',
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-[var(--bg-1)] transition-transform',
        'data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-[var(--accent-text)]',
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
