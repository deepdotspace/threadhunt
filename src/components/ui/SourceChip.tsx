import * as React from 'react'

import { cn } from './utils'
import { SOURCES, srcVar, srcTextColor, type SourceId } from '../../themes'

/*
 * Source letter chip — a colored square with a single display-font letter.
 * Background is the per-source tint; text is white (or near-black for X,
 * whose dark tint is pale). Sizes match list (18), detail (22), venue (18).
 */
const SIZE: Record<NonNullable<SourceChipProps['size']>, { box: string; radius: string; text: string }> = {
  sm: { box: 'h-[18px] w-[18px]', radius: 'rounded-[5px]', text: 'text-[10.5px]' },
  md: { box: 'h-[22px] w-[22px]', radius: 'rounded-[6px]', text: 'text-[12px]' },
}

export interface SourceChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  source: SourceId
  size?: 'sm' | 'md'
}

function SourceChip({ source, size = 'sm', className, style, ...props }: SourceChipProps) {
  const meta = SOURCES.find((s) => s.id === source)!
  const s = SIZE[size]
  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-content-center font-display font-bold leading-none',
        s.box,
        s.radius,
        s.text,
        className,
      )}
      style={{ background: srcVar(source), color: srcTextColor(source), ...style }}
      aria-hidden
      {...props}
    >
      {meta.letter}
    </span>
  )
}

export { SourceChip }
