/*
 * History header controls: a Group-by toggle (Day/Topic),
 * a date-range dropdown, an action filter (All/Posted/Edited/Skipped), and an
 * Export menu (CSV/JSON/Copy). A single fixed backdrop closes whichever menu is
 * open. All chrome is bg-2/border per the spec.
 */

import { RANGE_OPTIONS, rangeLabel } from './format'
import type { ActionFilter, GroupBy, RangeKey } from './types'

export type ExportKind = 'csv' | 'json' | 'clip'
type OpenMenu = 'range' | 'export' | null

const GROUP_TABS: { key: GroupBy; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'topic', label: 'Topic' },
]

const ACTION_TABS: { key: ActionFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'posted', label: 'Posted' },
  { key: 'edited', label: 'Edited' },
  { key: 'skipped', label: 'Skipped' },
]

const EXPORT_ITEMS: { kind: ExportKind; label: string }[] = [
  { kind: 'csv', label: 'Download CSV' },
  { kind: 'json', label: 'Download JSON' },
  { kind: 'clip', label: 'Copy to clipboard' },
]

const segClass =
  'rounded-[calc(var(--radius)-3px)] px-[11px] py-[5px] text-[12px] font-semibold transition-colors'
const menuClass =
  'absolute right-0 top-[calc(100%+6px)] z-30 rounded-[var(--radius)] border border-border-2 bg-bg-2 p-[5px] animate-rs-in motion-reduce:animate-none'
const menuItemClass =
  'flex w-full cursor-pointer items-center whitespace-nowrap rounded-[calc(var(--radius)-3px)] px-2.5 py-2 text-left text-[12.5px] font-medium text-text-1 transition-colors hover:bg-bg-3'

interface HistoryControlsProps {
  groupBy: GroupBy
  onGroupBy: (g: GroupBy) => void
  action: ActionFilter
  onAction: (a: ActionFilter) => void
  range: RangeKey
  onRange: (r: RangeKey) => void
  openMenu: OpenMenu
  onOpenMenu: (m: OpenMenu) => void
  onExport: (kind: ExportKind) => void
}

export function HistoryControls({
  groupBy,
  onGroupBy,
  action,
  onAction,
  range,
  onRange,
  openMenu,
  onOpenMenu,
  onExport,
}: HistoryControlsProps) {
  return (
    <>
      {/* Group-by toggle */}
      <span className="hidden shrink-0 text-[11px] font-semibold text-text-3 xl:inline">
        Group
      </span>
      <div className="flex gap-[3px] rounded-[var(--radius)] border border-border bg-bg-2 p-0.5">
        {GROUP_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onGroupBy(t.key)}
            aria-pressed={groupBy === t.key}
            className={segClass}
            style={{
              background: groupBy === t.key ? 'var(--bg-1)' : 'transparent',
              color: groupBy === t.key ? 'var(--text-1)' : 'var(--text-3)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Date range dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => onOpenMenu(openMenu === 'range' ? null : 'range')}
          aria-haspopup="menu"
          aria-expanded={openMenu === 'range'}
          className="inline-flex items-center gap-[7px] rounded-[var(--radius)] border border-border bg-bg-2 px-[11px] py-1.5 text-[12px] font-semibold text-text-2 transition-colors hover:bg-bg-3 hover:text-text-1"
        >
          {rangeLabel(range)}
          <span className="text-[9px] text-text-3" aria-hidden>
            ▾
          </span>
        </button>
        {openMenu === 'range' && (
          <div
            role="menu"
            className={`${menuClass} min-w-[168px] shadow-[var(--shadow)]`}
          >
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  onRange(r.key)
                  onOpenMenu(null)
                }}
                className={`${menuItemClass} justify-between`}
              >
                {r.label}
                {range === r.key && <span className="text-accent">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action filter */}
      <div className="flex gap-[3px] rounded-[var(--radius)] border border-border bg-bg-2 p-0.5">
        {ACTION_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onAction(t.key)}
            aria-pressed={action === t.key}
            className={segClass}
            style={{
              background: action === t.key ? 'var(--bg-1)' : 'transparent',
              color: action === t.key ? 'var(--text-1)' : 'var(--text-3)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Export menu */}
      <div className="relative">
        <button
          type="button"
          onClick={() => onOpenMenu(openMenu === 'export' ? null : 'export')}
          aria-haspopup="menu"
          aria-expanded={openMenu === 'export'}
          className="inline-flex items-center gap-[7px] rounded-[var(--radius)] bg-accent px-[13px] py-1.5 text-[12px] font-bold text-accent-text transition-[filter] hover:brightness-[1.06]"
        >
          Export
          <span className="text-[9px]" aria-hidden>
            ▾
          </span>
        </button>
        {openMenu === 'export' && (
          <div
            role="menu"
            className={`${menuClass} min-w-[180px] shadow-[var(--shadow)]`}
          >
            {EXPORT_ITEMS.map((x) => (
              <button
                key={x.kind}
                type="button"
                role="menuitem"
                onClick={() => onExport(x.kind)}
                className={menuItemClass}
              >
                {x.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
