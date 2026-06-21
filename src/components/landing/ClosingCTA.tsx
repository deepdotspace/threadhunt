/*
 * Closing CTA: a centered accent-bordered panel with a slow drifting glow and
 * the final Get started action.
 */

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { BRAND } from '../../themes'
import { useReducedMotion } from './motion'

export function ClosingCTA({ onGetStarted }: { onGetStarted: () => void }) {
  const reduced = useReducedMotion()
  return (
    <section className="mx-auto w-full max-w-[1240px] px-6 py-20 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--bg-2)] px-8 py-16 text-center"
      >
        {!reduced && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-[360px] w-[520px] -translate-x-1/2 rounded-full blur-[110px]"
            style={{ background: 'var(--accent-soft)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <div className="relative">
          <span className="mx-auto grid h-11 w-11 place-content-center rounded-[var(--radius)] bg-[var(--accent)] font-display text-[22px] font-bold text-[var(--accent-text)]">
            {BRAND.glyph}
          </span>
          <h2 className="mx-auto mt-6 max-w-[560px] font-display text-[32px] font-bold leading-tight tracking-[-0.02em] text-[var(--text-1)] sm:text-[40px]">
            Stop scrolling for threads. Start triaging them.
          </h2>
          <p className="mx-auto mt-4 max-w-[460px] text-[15px] leading-relaxed text-[var(--text-2)]">
            Create a topic, answer two questions, and let the queue fill with
            conversations worth your reply.
          </p>
          <button
            type="button"
            onClick={onGetStarted}
            className="group mt-8 inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--accent)] px-6 py-3 font-ui text-[14px] font-bold text-[var(--accent-text)] transition-all hover:brightness-[1.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-2)]"
          >
            Get started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </motion.div>
    </section>
  )
}
