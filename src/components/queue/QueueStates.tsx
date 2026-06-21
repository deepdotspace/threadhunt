/*
 * Non-list queue states: the caught-up empty state with a
 * "Run scan now" button, and the two-pane loading skeleton. Centered columns
 * enter with rs-in.
 */

import { Check } from 'lucide-react'

export function CaughtUp({
  nextScan,
  scanning,
  onScanNow,
}: {
  nextScan: string
  scanning: boolean
  onScanNow: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center [animation:rs-in_0.3s_ease]">
      <span className="grid h-16 w-16 place-content-center rounded-full bg-accent-soft" aria-hidden>
        <Check className="h-[26px] w-[26px] text-accent" />
      </span>
      <h2 className="mt-5 font-display text-[22px] font-bold tracking-[-0.02em] text-text-1">
        You are caught up
      </h2>
      <p className="mt-2 max-w-[360px] text-[14px] leading-relaxed text-text-3">
        Nothing left to review here. The next scan runs {nextScan}, or run one now.
      </p>
      <button
        type="button"
        onClick={onScanNow}
        disabled={scanning}
        className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius)] border border-border bg-bg-2 px-4 py-2 text-[13px] font-semibold text-text-2 transition-colors hover:bg-bg-3 hover:text-text-1 disabled:pointer-events-none disabled:opacity-60"
      >
        {scanning && (
          <span className="h-3.5 w-3.5 animate-rs-spin rounded-full border-[1.5px] border-border-2 border-t-accent" aria-hidden />
        )}
        {scanning ? 'Scanning' : 'Run scan now'}
      </button>
    </div>
  )
}

export function Scanning({ message }: { message?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center [animation:rs-in_0.3s_ease]">
      <span className="grid h-16 w-16 place-content-center rounded-full bg-accent-soft" aria-hidden>
        <span className="h-[26px] w-[26px] animate-rs-spin rounded-full border-2 border-border-2 border-t-accent" />
      </span>
      <h2 className="mt-5 font-display text-[22px] font-bold tracking-[-0.02em] text-text-1">
        Scanning for conversations...
      </h2>
      {message && (
        <p className="mt-2 max-w-[360px] text-[14px] leading-relaxed text-text-3">{message}</p>
      )}
    </div>
  )
}

export function QueueSkeleton() {
  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-[452px] flex-none flex-col border-r border-border bg-bg-1">
        <div className="flex-none border-b border-border px-[14px] py-[11px]">
          <div className="h-7 w-full animate-rs-pulse rounded-[20px] bg-bg-2" />
          <div className="mt-2.5 h-6 w-2/3 animate-rs-pulse rounded-[var(--radius)] bg-bg-2" />
        </div>
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="border-b border-border py-[11px] pl-4 pr-[14px]">
              <div className="h-[18px] w-1/3 animate-rs-pulse rounded-[var(--radius)] bg-bg-2" />
              <div className="mt-1.5 h-4 w-5/6 animate-rs-pulse rounded-[var(--radius)] bg-bg-2" />
              <div className="mt-1.5 h-3 w-1/2 animate-rs-pulse rounded-[var(--radius)] bg-bg-2" />
            </div>
          ))}
        </div>
      </section>
      <section className="flex min-w-0 flex-1 items-center justify-center bg-bg-1">
        <span className="h-6 w-6 animate-rs-spin rounded-full border-2 border-border-2 border-t-accent" aria-hidden />
      </section>
    </div>
  )
}
