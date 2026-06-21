/*
 * Reply Radar queue toasts. Bottom-center over the detail pane,
 * bg-3 with the elevation shadow, entering with rs-toast. Two kinds: an undo
 * toast (label + Undo button) shown after a skip, and a flash toast (leading
 * check + text) shown after a copy. Auto-dismiss is owned by the page.
 */

import { Check } from 'lucide-react'

export function UndoToast({ label, onUndo }: { label: string; onUndo: () => void }) {
  return (
    <div
      className="absolute bottom-[74px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-[var(--radius)] border border-border-2 bg-bg-3 py-2.5 pl-4 pr-3 text-[13px] text-text-1 shadow-[var(--shadow)] [animation:rs-toast_0.22s_ease]"
      role="status"
    >
      {label}
      <button
        type="button"
        onClick={onUndo}
        className="rounded-[var(--radius)] border border-border-2 bg-bg-1 px-2 py-1 text-[12.5px] font-bold text-text-1 transition-colors hover:bg-accent hover:text-accent-text"
      >
        Undo
      </button>
    </div>
  )
}

export function FlashToast({ label }: { label: string }) {
  return (
    <div
      className="absolute bottom-[74px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-[var(--radius)] border border-border-2 bg-bg-3 px-4 py-2.5 text-[13px] text-text-1 shadow-[var(--shadow)] [animation:rs-toast_0.22s_ease]"
      role="status"
    >
      <Check className="h-3.5 w-3.5 text-accent" aria-hidden />
      {label}
    </div>
  )
}
