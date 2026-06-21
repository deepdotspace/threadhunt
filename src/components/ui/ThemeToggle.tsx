import * as React from 'react'
import { Sun, Moon } from 'lucide-react'

import { cn } from './utils'
import { useTheme } from '../../lib/theme'

/*
 * Theme toggle. 32x32 round button. Shows the sun in dark mode (click
 * to go light) and the moon in light mode (click to go dark). Reply Radar locks a
 * single direction, so this is the only theme control.
 */
function ThemeToggle({ className, ...props }: React.HTMLAttributes<HTMLButtonElement>) {
  const { mode, toggle } = useTheme()
  const isDark = mode === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle theme"
      aria-label="Toggle theme"
      className={cn(
        'grid h-8 w-8 place-content-center rounded-full text-[var(--text-2)] transition-colors hover:bg-[var(--bg-1)] hover:text-[var(--text-1)]',
        className,
      )}
      {...props}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

export { ThemeToggle }
