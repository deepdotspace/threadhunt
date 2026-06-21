/*
 * Landing top bar: sticky, hairline-bordered, with the Reply Radar mark, anchor
 * links, the theme toggle, and the primary CTA. Backdrop blurs on scroll.
 */

import { useEffect, useState } from 'react'
import { ThemeToggle } from '../ui'
import { BRAND } from '../../themes'

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#venues', label: 'Venues' },
  { href: '#topics', label: 'Topics' },
]

export function LandingNav({ onGetStarted }: { onGetStarted: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="sticky top-0 z-50 border-b transition-colors"
      style={{
        borderColor: scrolled ? 'var(--border)' : 'transparent',
        background: scrolled ? 'color-mix(in srgb, var(--bg-1) 82%, transparent)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
      }}
    >
      <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center gap-3 px-6 lg:px-10">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-content-center rounded-[6px] bg-[var(--accent)] font-display text-[15px] font-bold text-[var(--accent-text)]">
            {BRAND.glyph}
          </span>
          <span className="font-display text-[16px] font-bold tracking-[-0.02em] text-[var(--text-1)]">
            {BRAND.name}
          </span>
        </a>

        <nav className="ml-6 hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium text-[var(--text-2)] transition-colors hover:text-[var(--text-1)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={onGetStarted}
            className="rounded-[var(--radius)] bg-[var(--accent)] px-4 py-2 font-ui text-[13px] font-bold text-[var(--accent-text)] transition-all hover:brightness-[1.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Get started
          </button>
        </div>
      </div>
    </header>
  )
}
