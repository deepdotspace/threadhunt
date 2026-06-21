/*
 * One History group: a sticky day-or-topic label
 * with a count, above a single bordered bg-2 card whose rows are separated by
 * hairline borders.
 */

import { HistoryRow } from './HistoryRow'
import { dayLabel } from './format'
import type { GroupBy, HistoryEntry, HistoryGroupView } from './types'

interface HistoryGroupProps {
  group: HistoryGroupView
  groupBy: GroupBy
  openId: string | null
  onToggle: (id: string) => void
  onCopy: (entry: HistoryEntry) => void
}

export function HistoryGroup({ group, groupBy, openId, onToggle, onCopy }: HistoryGroupProps) {
  return (
    <div className="mb-[26px]">
      <div className="sticky top-0 z-[1] bg-bg-1 px-0 pb-2.5 pt-1 text-[11px] font-bold uppercase tracking-[var(--label-spacing)] text-text-3">
        {group.key}
        <span className="ml-1 text-text-2">{group.count}</span>
      </div>
      <div className="flex flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-bg-2">
        {group.items.map((entry) => (
          <HistoryRow
            key={entry.id}
            entry={entry}
            meta={groupBy === 'day' ? entry.topic : dayLabel(entry.createdAt)}
            open={openId === entry.id}
            onToggle={() => onToggle(entry.id)}
            onCopy={() => onCopy(entry)}
          />
        ))}
      </div>
    </div>
  )
}
