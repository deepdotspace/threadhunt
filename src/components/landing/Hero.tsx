/*
 * Hero: the Reply Radar mark + wordmark, a grounded value prop, the primary CTA,
 * the keyboard-first cue, and the animated triage demo. An ambient lime glow
 * drifts behind the demo for depth without a texture image.
 */

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Kbd } from '../ui'
import { BRAND } from '../../themes'
import { TriageDemo } from './TriageDemo'
import { useReducedMotion } from './motion'

export function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  const reduced = useReducedMotion()
  return (
    <section className="relative mx-auto w-full max-w-[1240px] px-6 pt-16 pb-10 sm:pt-24 lg:px-10">
      {/* Ambient accent glow behind the demo */}
      {!reduced && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-10 right-0 h-[460px] w-[640px] rounded-full blur-[120px]"
          style={{ background: 'var(--accent-soft)' }}
          animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.08, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10">
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-content-center rounded-[6px] bg-[var(--accent)] font-display text-[18px] font-bold text-[var(--accent-text)]">
              {BRAND.glyph}
            </span>
            <span className="font-display text-[18px] font-bold tracking-[-0.02em] text-[var(--text-1)]">
              {BRAND.name}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-3)]">
              {BRAND.tag}
            </span>
          </div>

          <h1 className="mt-6 font-display text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--text-1)] sm:text-[52px]">
            Find the threads worth a reply,{' '}
            <span className="text-[var(--accent)]">post them by hand.</span>
          </h1>

          <p className="mt-5 max-w-[480px] text-[15.5px] leading-relaxed text-[var(--text-2)]">
            Reply Radar scans Reddit, Hacker News, X, Indie Hackers, and Dev.to for
            conversations where your product genuinely helps, scores each one, and
            drafts a reply. You read the thread, edit the draft, and post it
            yourself. It never posts for you.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onGetStarted}
              className="group inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--accent)] px-5 py-3 font-ui text-[14px] font-bold text-[var(--accent-text)] transition-all hover:brightness-[1.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-1)]"
            >
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <span className="flex items-center gap-2 text-[12.5px] text-[var(--text-3)]">
              Keyboard first.
              <Kbd>J</Kbd>
              <Kbd>K</Kbd> move
              <Kbd>E</Kbd> draft
              <Kbd>P</Kbd> post
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 26, scale: reduced ? 1 : 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <TriageDemo />
        </motion.div>
      </div>
    </section>
  )
}
