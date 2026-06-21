/*
 * Shared chrome for placeholder screens: the 54px Reply Radar header plus a
 * centered "coming next" note. The real screen bodies replace these in a later
 * round; the header keeps navigation legible meanwhile.
 */

import type { ReactNode } from 'react'

export function ScreenHeader({
  title,
  meta,
  actions,
}: {
  title: string
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex h-[54px] flex-none items-center gap-2.5 border-b border-border bg-bg-1 px-[18px]">
      <h1 className="font-display text-[17px] font-bold tracking-[-0.02em] text-text-1">
        {title}
      </h1>
      {meta && <span className="text-[12px] text-text-3">{meta}</span>}
      <div className="flex-1" />
      {actions}
    </header>
  )
}

export function PlaceholderBody({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 text-center">
      <p className="max-w-[360px] text-[13px] leading-relaxed text-text-3">
        {label} lands in the next round. The shell, sidebar, and routing are
        wired so this screen is reachable now.
      </p>
    </div>
  )
}
