/*
 * Landing footer: mark, one honest line about what Reply Radar does and does not do,
 * and anchor links. Plain, no newsletter, no social wall.
 */

import { BRAND } from '../../themes'

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-0)]">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-content-center rounded-[6px] bg-[var(--accent)] font-display text-[15px] font-bold text-[var(--accent-text)]">
            {BRAND.glyph}
          </span>
          <div>
            <div className="font-display text-[14px] font-bold tracking-[-0.02em] text-[var(--text-1)]">
              {BRAND.name}
            </div>
            <div className="text-[11.5px] text-[var(--text-3)]">
              Finds threads worth a reply. You post them yourself.
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-5">
          {[
            { href: '#how', label: 'How it works' },
            { href: '#venues', label: 'Venues' },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[12.5px] text-[var(--text-3)] transition-colors hover:text-[var(--text-1)]"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}
