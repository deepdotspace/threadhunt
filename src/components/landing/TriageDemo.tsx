/*
 * The hero product mock: a live-feeling two-pane triage client. Rows arrive,
 * one stays selected, a draft shimmers then types in, and the demo skips a row
 * with an undo toast on a loop. Faithful to the Reply Radar queue anatomy, scaled
 * down to fit the hero. Honors prefers-reduced-motion (no looping, draft shown).
 */

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, ArrowUpRight, RotateCcw } from 'lucide-react'
import { SourceChip, Kbd } from '../ui'
import { SOURCES, TYPES } from '../../themes'
import { DEMO_THREADS, DEMO_DRAFT, type DemoThread } from './data'
import { useReducedMotion } from './motion'

function MatchBars({ score }: { score: number }) {
  const filled = score >= 85 ? 3 : score >= 75 ? 2 : 1
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-[3px] rounded-[1px]"
          style={{ background: i < filled ? 'var(--accent)' : 'var(--border-2)' }}
        />
      ))}
    </span>
  )
}

function TypeDot({ type }: { type: DemoThread['type'] }) {
  const meta = TYPES.find((t) => t.id === type)!
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] text-[var(--text-3)]">
      <span className="h-1.5 w-1.5 rounded-[2px]" style={{ background: meta.dot }} />
      {meta.label}
    </span>
  )
}

function Row({ t, selected }: { t: DemoThread; selected: boolean }) {
  const label = SOURCES.find((s) => s.id === t.source)!.label
  return (
    <div
      className="relative cursor-default border-b border-[var(--border)] px-3 py-2.5 pl-4 transition-colors"
      style={{ background: selected ? 'var(--bg-sel)' : 'transparent' }}
    >
      {selected && (
        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-[1px] bg-[var(--accent)]" />
      )}
      <div className="flex items-center gap-2">
        <SourceChip source={t.source} size="sm" />
        <span className="text-[11.5px] font-semibold text-[var(--text-2)]">{label}</span>
        <span className="text-[10.5px] text-[var(--text-3)]">· {t.age}</span>
        <span className="ml-auto">
          {t.hasDraft ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--accent)]">
              <span className="h-[5px] w-[5px] rounded-full bg-[var(--accent)]" />
              Draft ready
            </span>
          ) : (
            <span
              className="block h-[7px] w-[7px] rounded-full bg-[var(--accent)]"
              style={{ boxShadow: '0 0 0 3px var(--accent-soft)' }}
            />
          )}
        </span>
      </div>
      <div className="mt-1.5 line-clamp-2 text-[12.5px] font-semibold leading-snug text-[var(--text-1)]">
        {t.title}
      </div>
      <div className="mt-1.5 flex items-center gap-2.5">
        <TypeDot type={t.type} />
        <span className="min-w-0 flex-1 truncate text-[10.5px] text-[var(--text-3)]">{t.sub}</span>
        <span className="flex items-center gap-1.5 tnum">
          <MatchBars score={t.score} />
          <span className="text-[10.5px] font-semibold text-[var(--text-2)]">{t.score}</span>
        </span>
      </div>
    </div>
  )
}

type ReplyPhase = 'empty' | 'generating' | 'typing' | 'draft'

export function TriageDemo() {
  const reduced = useReducedMotion()
  // How many rows are currently visible (rows stream in on mount).
  const [visible, setVisible] = useState(1)
  const [reply, setReply] = useState<ReplyPhase>('empty')
  const [typed, setTyped] = useState('')
  const [skipping, setSkipping] = useState(false)
  const [showUndo, setShowUndo] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const selected = DEMO_THREADS[0]

  useEffect(() => {
    if (reduced) {
      // Reduced motion: snap to the settled state, no loop.
      setVisible(DEMO_THREADS.length)
      setReply('draft')
      setTyped(DEMO_DRAFT)
      return
    }
    const add = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms))
    const run = () => {
      // Stream the rows in.
      DEMO_THREADS.forEach((_, i) => i > 0 && add(() => setVisible(i + 1), 260 * i))
      // Generate -> shimmer -> type the draft out.
      add(() => setReply('generating'), 1500)
      add(() => {
        setReply('typing')
        let n = 0
        const tick = () => {
          n += 2
          setTyped(DEMO_DRAFT.slice(0, n))
          if (n < DEMO_DRAFT.length) timers.current.push(setTimeout(tick, 18))
          else add(() => setReply('draft'), 200)
        }
        tick()
      }, 2900)
      // Skip-with-undo beat, then reset the loop.
      add(() => setSkipping(true), 6400)
      add(() => {
        setSkipping(false)
        setShowUndo(true)
      }, 6800)
      add(() => setShowUndo(false), 9000)
      add(() => {
        setVisible(1)
        setReply('empty')
        setTyped('')
        run()
      }, 10200)
    }
    run()
    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [reduced])

  const rows = DEMO_THREADS.slice(0, visible)

  return (
    <div className="relative w-full overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-1)] shadow-[var(--shadow)]">
      {/* Queue header */}
      <div className="flex h-[42px] items-center gap-2 border-b border-[var(--border)] px-4">
        <span className="font-display text-[14px] font-bold tracking-[-0.02em] text-[var(--text-1)]">
          Cookieless analytics
        </span>
        <span className="text-[var(--text-3)]">·</span>
        <span className="text-[11.5px] text-[var(--text-2)]">Promoting Plausible-style tool</span>
        <span className="ml-auto flex items-center gap-1.5 rounded-[20px] border border-[var(--border)] bg-[var(--bg-2)] px-2.5 py-1 text-[10.5px] text-[var(--text-3)]">
          <span className="h-2.5 w-2.5 animate-[var(--animate-rs-spin)] rounded-full border-[1.5px] border-[var(--border-2)] border-t-[var(--accent)]" />
          Scanning
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* List pane */}
        <div className="border-b border-[var(--border)] sm:border-b-0 sm:border-r">
          <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
            {['All', 'Reddit', 'HN', 'IH'].map((p, i) => (
              <span
                key={p}
                className="rounded-[20px] border px-2.5 py-1 text-[10.5px] font-semibold"
                style={
                  i === 0
                    ? { background: 'var(--accent-soft)', borderColor: 'var(--accent)', color: 'var(--text-1)' }
                    : { background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text-2)' }
                }
              >
                {p}
              </span>
            ))}
            <span className="ml-auto text-[10.5px] text-[var(--text-3)] tnum">
              <span className="font-bold text-[var(--text-1)]">{rows.length}</span> to review
            </span>
          </div>
          <div className="h-[383px] overflow-hidden">
            <AnimatePresence initial={false}>
              {rows.map((t, i) => (
                <motion.div
                  key={t.title}
                  initial={reduced ? false : { opacity: 0, y: -10 }}
                  animate={
                    skipping && i === 0
                      ? { opacity: 0, x: -16, transition: { duration: 0.3 } }
                      : { opacity: 1, x: 0, y: 0 }
                  }
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Row t={t} selected={i === 0} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Detail pane */}
        <div className="flex h-[420px] flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-3.5">
            <div className="mb-2 flex items-center gap-2">
              <SourceChip source={selected.source} size="md" />
              <span className="text-[12px] font-semibold text-[var(--text-2)]">
                {SOURCES.find((s) => s.id === selected.source)!.label}
              </span>
              <span className="text-[11px] text-[var(--text-3)]">· {selected.sub} · {selected.age} ago</span>
              <span className="ml-auto flex items-center gap-1 text-[11px] text-[var(--text-3)]">
                Open thread <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
            <h3 className="font-display text-[18px] font-bold leading-tight tracking-[-0.02em] text-[var(--text-1)]">
              {selected.title}
            </h3>
            <div className="mt-3 flex items-start gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2.5">
              <Sparkles className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
              <p className="text-[11.5px] leading-snug text-[var(--text-2)]">
                <span className="font-bold text-[var(--text-1)]">Why this is here. </span>
                {selected.reason}
              </p>
              <span className="ml-auto shrink-0 text-[12px] font-bold text-[var(--accent)] tnum">
                {selected.score}% match
              </span>
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)]">
              Thread
            </p>
            <div className="mt-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-2)] px-3.5 py-3 text-[12px] leading-relaxed text-[var(--text-2)]">
              We pulled the cookie banner and bounce rate dropped, but we still need real numbers.{' '}
              <mark
                className="rounded-[3px] px-1 text-[var(--text-1)]"
                style={{ background: 'var(--accent-soft)', boxShadow: '0 0 0 1px var(--border)' }}
              >
                Is there an analytics setup that needs no consent at all?
              </mark>
            </div>
          </div>

          {/* Reply footer */}
          <div className="border-t border-[var(--border)] bg-[var(--bg-0)] px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-[var(--text-3)]">
                Your reply
              </span>
              <span className="flex items-center gap-1 rounded-[20px] border border-[var(--border)] bg-[var(--bg-2)] p-[2px]">
                <span className="rounded-[20px] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-3)]">
                  Manual
                </span>
                <span className="rounded-[20px] bg-[var(--accent)] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent-text)]">
                  Auto draft
                </span>
              </span>
            </div>

            <ReplyBody phase={reply} typed={typed} />

            <div className="mt-2.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-2)] px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--text-2)]">
                Skip <Kbd>X</Kbd>
              </span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-[var(--radius)] border border-[var(--border-2)] bg-[var(--bg-2)] px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--text-1)]">
                Copy and open <ArrowUpRight className="h-3 w-3" />
              </span>
              <span
                className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] px-3 py-1.5 text-[11.5px] font-bold text-[var(--accent-text)] transition-opacity"
                style={{ opacity: reply === 'draft' ? 1 : 0.5 }}
              >
                Mark posted
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Undo toast */}
      <AnimatePresence>
        {showUndo && (
          <motion.div
            initial={{ opacity: 0, y: 14, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 8, x: '-50%' }}
            transition={{ duration: 0.22 }}
            className="absolute bottom-4 left-1/2 flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border-2)] bg-[var(--bg-3)] py-2 pl-3.5 pr-2.5 text-[12px] text-[var(--text-1)] shadow-[var(--shadow)]"
          >
            Skipped one thread
            <span className="rounded-[var(--radius)] border border-[var(--border-2)] bg-[var(--bg-1)] px-2 py-1 text-[11px] font-bold text-[var(--text-1)]">
              Undo
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ReplyBody({ phase, typed }: { phase: ReplyPhase; typed: string }) {
  if (phase === 'empty') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-dashed border-[var(--border-2)] bg-[var(--bg-1)] px-3.5 py-3">
        <p className="text-[11.5px] leading-snug text-[var(--text-3)]">
          Read the thread, then draft a reply that mentions your product where it helps.
        </p>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] bg-[var(--accent)] px-3 py-1.5 text-[11.5px] font-bold text-[var(--accent-text)]">
          <Sparkles className="h-3.5 w-3.5" /> Generate
        </span>
      </div>
    )
  }
  if (phase === 'generating') {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--border-2)] bg-[var(--bg-1)] px-3.5 py-3.5">
        <p className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold text-[var(--accent)]">
          <span className="h-3 w-3 animate-[var(--animate-rs-spin)] rounded-full border-[1.5px] border-[var(--border-2)] border-t-[var(--accent)]" />
          Drafting a reply
        </p>
        {['92%', '100%', '74%'].map((w) => (
          <span
            key={w}
            className="mb-2 block h-[11px] animate-[var(--animate-rs-shimmer)] rounded-[4px] last:mb-0"
            style={{
              width: w,
              backgroundImage:
                'linear-gradient(90deg, var(--bg-3) 25%, var(--bg-2) 37%, var(--bg-3) 63%)',
              backgroundSize: '600px 100%',
            }}
          />
        ))}
      </div>
    )
  }
  return (
    <div className="relative rounded-[var(--radius)] border border-[var(--border-2)] bg-[var(--bg-1)] px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--text-1)]">
      {typed}
      {phase === 'typing' && (
        <span className="ml-px inline-block h-[14px] w-[2px] animate-[var(--animate-rs-pulse)] align-middle bg-[var(--accent)]" />
      )}
    </div>
  )
}
