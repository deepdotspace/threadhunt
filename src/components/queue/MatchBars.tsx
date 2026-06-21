/*
 * The 3-bar match indicator. Three 3px x 8px bars aligned
 * to the bottom; filled bars are accent, empty bars are border-2. Fill count
 * comes from the score percent: >=85 -> 3, >=75 -> 2, else 1.
 */

import { matchBarsForPercent } from './sourceMeta'

export function MatchBars({ percent }: { percent: number }) {
  const filled = matchBarsForPercent(percent)
  return (
    <span className="flex items-end gap-[2px]" title="Match score" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-[3px] rounded-[1px]"
          style={{ background: i < filled ? 'var(--accent)' : 'var(--border-2)' }}
        />
      ))}
    </span>
  )
}
