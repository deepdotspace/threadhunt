/*
 * How it works: the four-stage pipeline (describe, scan, judge, reply) as
 * staggered cards joined by an accent line that draws in on scroll. Each card
 * carries a small animated glyph so the stage reads at a glance.
 */

import { motion } from 'framer-motion'
import { MessageSquareText, Radar, Scale, Send } from 'lucide-react'
import { Section, Eyebrow, SectionHeading } from './Section'
import { PIPELINE } from './data'
import { itemVariants, staggerVariants, useReducedMotion } from './motion'

const ICONS = [MessageSquareText, Radar, Scale, Send]

export function HowItWorks() {
  const reduced = useReducedMotion()
  return (
    <Section id="how">
      <Eyebrow>How it works</Eyebrow>
      <SectionHeading>Four steps from a question to a posted reply.</SectionHeading>
      <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed text-[var(--text-2)]">
        You set the intent once. Reply Radar does the searching and scoring on a
        schedule. The reply is always yours to write and send.
      </p>

      <motion.div
        variants={staggerVariants(reduced)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="relative mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Connector line behind the cards (desktop) */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute left-0 top-7 hidden h-px origin-left bg-[var(--accent)] lg:block"
          style={{ width: '100%' }}
          initial={{ scaleX: reduced ? 1 : 0, opacity: 0.4 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
        {PIPELINE.map((step, i) => {
          const Icon = ICONS[i]
          return (
            <motion.div
              key={step.key}
              variants={itemVariants(reduced)}
              className="relative rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-2)] p-5"
            >
              <div className="flex items-center gap-3">
                <span className="relative grid h-11 w-11 place-content-center rounded-[var(--radius)] bg-[var(--accent-soft)]">
                  {!reduced && (
                    <motion.span
                      className="absolute inset-0 rounded-[var(--radius)] border border-[var(--accent)]"
                      animate={{ opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.4 }}
                    />
                  )}
                  <Icon className="h-5 w-5 text-[var(--accent)]" />
                </span>
                <span className="font-display text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)] tnum">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-[18px] font-bold tracking-[-0.02em] text-[var(--text-1)]">
                {step.label}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-2)]">{step.line}</p>
            </motion.div>
          )
        })}
      </motion.div>
    </Section>
  )
}
