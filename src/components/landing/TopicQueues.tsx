/*
 * Per-topic queues: each thing you track owns its own queue, schedule, venues,
 * and draft mode, and they never blend. An animated topic list cycles its
 * selection so each topic's settings surface in turn.
 */

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarClock, Layers, PenLine } from 'lucide-react'
import { Section, Eyebrow, SectionHeading } from './Section'
import { SourceChip } from '../ui'
import type { SourceId } from '../../themes'
import { useReducedMotion } from './motion'

interface DemoTopic {
  name: string
  product: string
  unread: number
  venues: SourceId[]
  schedule: string
  draftMode: string
}

const TOPICS: DemoTopic[] = [
  {
    name: 'Cookieless analytics',
    product: 'Privacy-first analytics',
    unread: 5,
    venues: ['reddit', 'hn', 'ih'],
    schedule: 'Twice a day, around 9:00 AM',
    draftMode: 'Auto draft',
  },
  {
    name: 'Self-hosted error tracking',
    product: 'Open-source Sentry alternative',
    unread: 2,
    venues: ['reddit', 'hn', 'devto'],
    schedule: 'Once a day',
    draftMode: 'Manual',
  },
  {
    name: 'No-code internal tools',
    product: 'Internal tooling builder',
    unread: 8,
    venues: ['reddit', 'devto', 'x'],
    schedule: 'Three times a day',
    draftMode: 'Auto draft',
  },
]

export function TopicQueues() {
  const reduced = useReducedMotion()
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setActive((a) => (a + 1) % TOPICS.length), 3200)
    return () => clearInterval(id)
  }, [reduced])

  const topic = TOPICS[active]

  return (
    <Section id="topics">
      <Eyebrow>Per-topic queues</Eyebrow>
      <SectionHeading>Every topic keeps its own queue and rules.</SectionHeading>
      <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed text-[var(--text-2)]">
        A topic holds its two setup answers, its search queries, its venues, its
        schedule, and its draft mode. Threads from one topic never bleed into
        another, so each queue stays focused on one job.
      </p>

      <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        {/* Topic list */}
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-0)] p-3">
          <div className="px-1 pb-2 text-[10.5px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)]">
            Topics
          </div>
          <div className="flex flex-col gap-1">
            {TOPICS.map((t, i) => (
              <button
                key={t.name}
                type="button"
                onClick={() => setActive(i)}
                className="relative flex items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-2 text-left transition-colors"
                style={{ background: i === active ? 'var(--bg-2)' : 'transparent' }}
              >
                {i === active && (
                  <motion.span
                    layoutId="topic-rail"
                    className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-[1px] bg-[var(--accent)]"
                  />
                )}
                <span
                  className="h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ background: i === active ? 'var(--accent)' : 'var(--text-3)' }}
                />
                <span
                  className="min-w-0 flex-1 truncate text-[13px]"
                  style={{
                    color: i === active ? 'var(--text-1)' : 'var(--text-2)',
                    fontWeight: t.unread > 0 ? 600 : 500,
                  }}
                >
                  {t.name}
                </span>
                {t.unread > 0 && (
                  <span className="rounded-[20px] bg-[var(--accent-soft)] px-1.5 py-px text-[11px] font-bold text-[var(--accent)] tnum">
                    {t.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Active topic settings */}
        <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-2)] p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={topic.name}
              initial={{ opacity: 0, y: reduced ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-[22px] font-bold tracking-[-0.02em] text-[var(--text-1)]">
                  {topic.name}
                </h3>
                <span className="rounded-[20px] bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent)] tnum">
                  {topic.unread} to review
                </span>
              </div>
              <p className="mt-1 text-[13px] text-[var(--text-3)]">Promoting {topic.product}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Detail icon={<Layers className="h-4 w-4" />} label="Venues">
                  <span className="flex items-center gap-1.5">
                    {topic.venues.map((v) => (
                      <SourceChip key={v} source={v} size="sm" />
                    ))}
                  </span>
                </Detail>
                <Detail icon={<CalendarClock className="h-4 w-4" />} label="Schedule">
                  <span className="text-[13px] text-[var(--text-1)]">{topic.schedule}</span>
                </Detail>
                <Detail icon={<PenLine className="h-4 w-4" />} label="Draft mode">
                  <span className="text-[13px] text-[var(--text-1)]">{topic.draftMode}</span>
                </Detail>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Section>
  )
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-1)] p-3.5">
      <div className="flex items-center gap-1.5 text-[var(--text-3)]">
        {icon}
        <span className="text-[10.5px] font-bold uppercase tracking-[0.15em]">{label}</span>
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  )
}
