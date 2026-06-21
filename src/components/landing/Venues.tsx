/*
 * Venues: the five places Reply Radar reads. Animated source chips drift on a loop
 * and a sample query "fans out" to each venue to show the one-mechanism search.
 */

import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { Section, Eyebrow, SectionHeading } from './Section'
import { SourceChip } from '../ui'
import { SOURCES } from '../../themes'
import { itemVariants, staggerVariants, useReducedMotion } from './motion'

const SUBS: Record<string, string> = {
  reddit: 'site:reddit.com',
  hn: 'site:news.ycombinator.com',
  ih: 'site:indiehackers.com',
  devto: 'site:dev.to',
  x: 'site:x.com',
}

export function Venues() {
  const reduced = useReducedMotion()
  return (
    <Section id="venues" className="!pt-4">
      <Eyebrow>Where it looks</Eyebrow>
      <SectionHeading>Five venues, one search mechanism.</SectionHeading>
      <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed text-[var(--text-2)]">
        Reddit and Hacker News are on by default. X, Indie Hackers, and Dev.to
        are optional. Every venue is searched the same way, so there are no
        platform API keys to set up and forking it takes a few commands.
      </p>

      <motion.div
        variants={staggerVariants(reduced)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {SOURCES.map((s, i) => (
          <motion.div
            key={s.id}
            variants={itemVariants(reduced)}
            className="group flex flex-col items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-2)] p-4 transition-colors hover:border-[var(--border-2)]"
          >
            <motion.div
              animate={reduced ? undefined : { y: [0, -5, 0] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }}
            >
              <SourceChip source={s.id} size="md" />
            </motion.div>
            <div>
              <div className="font-display text-[14px] font-bold tracking-[-0.02em] text-[var(--text-1)]">
                {s.label}
              </div>
              <code className="mt-1 block text-[11px] text-[var(--text-3)]">{SUBS[s.id]}</code>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* The query fanning out to the venues */}
      <div className="mt-10 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-2)] px-4 py-3.5">
        <span className="flex items-center gap-2 text-[13px] text-[var(--text-2)]">
          <Search className="h-3.5 w-3.5 text-[var(--text-3)]" />
          <code className="text-[var(--text-1)]">cookieless analytics</code>
        </span>
        <span className="text-[var(--text-3)]">fans out to</span>
        <span className="flex items-center gap-1.5">
          {SOURCES.map((s, i) => (
            <motion.span
              key={s.id}
              animate={reduced ? undefined : { opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            >
              <SourceChip source={s.id} size="sm" />
            </motion.span>
          ))}
        </span>
      </div>
    </Section>
  )
}
