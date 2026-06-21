/*
 * Detail pane: source meta + Open thread link, the
 * display-font title, the "why this is here" card, the thread excerpt with the
 * highlighted passages, then the reply area in its three states, then the
 * sticky Skip / Copy and open / Mark posted bar. Reading content and the reply
 * footer both constrain inner width to 760px.
 */

import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react'
import type { RecordData } from 'deepspace'
import { ArrowUpRight, Sparkles, RotateCcw } from 'lucide-react'
import type { CandidateData, DraftMode, DraftModel } from '../../types'
import { FUNNEL } from '../../config'
import { SourceChip, Textarea, Kbd, Input } from '../ui'
import { authorInitial, relativeAge, scoreToPercent, venueLabel, venueToSource } from './sourceMeta'

export type ReplyState = 'empty' | 'generating' | 'draft'
export type ReplyMode = DraftMode

interface CandidatePaneProps {
  candidate: RecordData<CandidateData>
  replyState: ReplyState
  mode: ReplyMode
  draft: string
  posting: boolean
  skipping: boolean
  copied: boolean
  generating: boolean
  model: DraftModel
  onModelChange: (model: DraftModel) => void
  instruction: string
  onInstructionChange: (value: string) => void
  onModeChange: (mode: ReplyMode) => void
  onDraftChange: (value: string) => void
  onGenerate: () => void
  onCopyOpen: () => void
  onMarkPosted: () => void
  onSkip: () => void
}

export const CandidatePane = forwardRef<HTMLTextAreaElement, CandidatePaneProps>(function CandidatePane(
  {
    candidate,
    replyState,
    mode,
    draft,
    posting,
    skipping,
    copied,
    generating,
    model,
    onModelChange,
    instruction,
    onInstructionChange,
    onModeChange,
    onDraftChange,
    onGenerate,
    onCopyOpen,
    onMarkPosted,
    onSkip,
  },
  draftRef,
) {
  const d = candidate.data
  // The SDK reads empty text/json columns back as undefined; normalize the
  // optional fields so the excerpt and highlights rendering never touch undefined.
  const excerpt = d.excerpt ?? ''
  const highlights = d.highlights ?? []
  const pct = scoreToPercent(d.score)
  const hasDraft = replyState === 'draft'
  const busy = posting || skipping

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Scrollable read region */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[760px] px-[30px] pb-3 pt-[22px]">
          {/* Source meta row */}
          <div className="mb-3.5 flex items-center gap-2.5">
            <SourceChip source={venueToSource(d.source)} size="md" />
            <span className="text-[13px] font-semibold text-text-2">{venueLabel(d.source)}</span>
            <span className="truncate text-[12px] text-text-3">
              · {d.subsection}
              {relativeAge(d.publishedAt) ? ` · ${relativeAge(d.publishedAt)} ago` : ''}
            </span>
            <a
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex shrink-0 items-center gap-1 text-[12px] text-text-3 transition-colors hover:text-accent"
            >
              Open thread <ArrowUpRight className="h-3 w-3" aria-hidden />
            </a>
          </div>

          {/* Title */}
          <h2
            className="font-display text-[25px] font-bold leading-[1.18] tracking-[-0.02em] text-text-1"
            style={{ textWrap: 'pretty' }}
          >
            {d.title}
          </h2>

          {/* Why this is here card */}
          <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius)] border border-border bg-accent-soft px-3.5 py-2.5">
            <Sparkles className="mt-px h-[18px] w-[18px] shrink-0 text-accent" aria-hidden />
            <p className="text-[12.5px] leading-[1.4] text-text-2">
              <span className="font-bold text-text-1">Why this is here. </span>
              {d.reason}
            </p>
            <span className="ml-auto shrink-0 text-[13px] font-bold text-accent tnum">{pct}% match</span>
          </div>

          {/* Thread excerpt */}
          <p className="mt-4 text-[10.5px] font-bold uppercase tracking-[0.15em] text-text-3">Thread</p>
          <div className="mt-2 rounded-[var(--radius)] border border-border bg-bg-2 px-[18px] py-4">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="grid h-5 w-5 place-content-center rounded-full bg-bg-3 text-[10px] font-bold text-text-2" aria-hidden>
                {authorInitial(d.author)}
              </span>
              <span className="text-[12px] font-semibold text-text-2">{d.author || 'OP'}</span>
            </div>
            <p className="text-[14.5px] leading-[1.65] text-text-2">
              <Excerpt excerpt={excerpt} highlights={highlights} />
            </p>
          </div>

          {/* Highlight legend */}
          {highlights.length > 0 && (
            <p className="mt-2.5 flex items-center gap-2 text-[11.5px] text-text-3">
              <span
                className="inline-block h-2 w-3 rounded-[2px]"
                style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}
                aria-hidden
              />
              Highlighted passages are the parts worth replying to.
            </p>
          )}
        </div>
      </div>

      {/* Reply area + sticky action bar */}
      <div className="flex-none border-t border-border bg-bg-0">
        <div className="mx-auto max-w-[760px] px-[30px] py-3.5">
          {/* Header: eyebrow + mode toggle */}
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-text-3">Your reply</span>
            <div className="flex items-center gap-[3px] rounded-[20px] border border-border bg-bg-2 p-0.5">
              {(['manual', 'auto'] as const).map((m) => {
                const active = mode === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onModeChange(m)}
                    aria-pressed={active}
                    className="rounded-[20px] px-2.5 py-[3px] text-[11px] font-semibold transition-colors"
                    style={{
                      background: active ? 'var(--accent)' : 'transparent',
                      color: active ? 'var(--accent-text)' : 'var(--text-3)',
                    }}
                  >
                    {m === 'manual' ? 'Manual' : 'Auto draft'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reply model picker (haiku/sonnet/opus). */}
          <div className="mb-2.5 flex items-center gap-2">
            <span className="text-[11px] text-text-3">Model</span>
            <div className="flex items-center gap-[3px] rounded-[20px] border border-border bg-bg-2 p-0.5">
              {(['haiku', 'sonnet', 'opus'] as const).map((m) => {
                const active = model === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onModelChange(m)}
                    aria-pressed={active}
                    className="rounded-[20px] px-2.5 py-[3px] text-[11px] font-semibold capitalize transition-colors"
                    style={{
                      background: active ? 'var(--accent)' : 'transparent',
                      color: active ? 'var(--accent-text)' : 'var(--text-3)',
                    }}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Optional one-off instruction applied to the next generate/regenerate. */}
          <Input
            value={instruction}
            onChange={(e) => onInstructionChange(e.target.value)}
            placeholder="Optional: nudge this reply, e.g. shorter, more technical"
            aria-label="Reply instruction"
            className="mb-2.5 py-2 text-[12.5px]"
          />

          {/* The three reply states */}
          <ReplyBody
            ref={draftRef}
            state={replyState}
            draft={draft}
            product={d.draftText}
            generating={generating}
            disabled={busy}
            onDraftChange={onDraftChange}
            onGenerate={onGenerate}
          />

          {/* Sticky action bar */}
          <div className="mt-3.5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onSkip}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-border bg-bg-2 px-3 py-2 text-[13px] font-semibold text-text-2 transition-colors hover:bg-bg-3 hover:text-text-1 disabled:pointer-events-none disabled:opacity-50"
            >
              {skipping ? 'Skipping' : 'Skip'} <Kbd>X</Kbd>
            </button>
            <div className="ml-auto flex items-center gap-2.5">
              <button
                type="button"
                onClick={onCopyOpen}
                disabled={!hasDraft || busy}
                className="inline-flex items-center gap-1 rounded-[var(--radius)] border border-border-2 bg-bg-2 px-3 py-2 text-[13px] font-semibold text-text-1 transition-colors hover:bg-bg-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? 'Copied' : 'Copy and open'} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onMarkPosted}
                disabled={!hasDraft || busy}
                className="inline-flex items-center rounded-[var(--radius)] bg-accent px-[18px] py-2 text-[13px] font-bold text-accent-text transition-[filter,opacity] hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark posted
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

/** Render the excerpt with `highlights` substrings wrapped in emphasized marks. */
function Excerpt({ excerpt, highlights }: { excerpt: string; highlights: string[] }) {
  const phrases = highlights.filter((h) => h && excerpt.includes(h))
  if (phrases.length === 0) return <>{excerpt}</>

  // Split the excerpt around each highlight phrase, preserving order.
  const parts: { text: string; hl: boolean }[] = [{ text: excerpt, hl: false }]
  for (const phrase of phrases) {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (part.hl) continue
      const idx = part.text.indexOf(phrase)
      if (idx === -1) continue
      const before = part.text.slice(0, idx)
      const after = part.text.slice(idx + phrase.length)
      const replacement: { text: string; hl: boolean }[] = []
      if (before) replacement.push({ text: before, hl: false })
      replacement.push({ text: phrase, hl: true })
      if (after) replacement.push({ text: after, hl: false })
      parts.splice(i, 1, ...replacement)
      i += replacement.length - 1
    }
  }

  return (
    <>
      {parts.map((p, i) =>
        p.hl ? (
          <mark
            key={i}
            className="rounded-[3px] px-[3px] py-px text-text-1"
            style={{ background: 'var(--accent-soft)', boxShadow: '0 0 0 1px var(--border)' }}
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  )
}

interface ReplyBodyProps {
  state: ReplyState
  draft: string
  product: string
  generating: boolean
  disabled: boolean
  onDraftChange: (value: string) => void
  onGenerate: () => void
}

const ReplyBody = forwardRef<HTMLTextAreaElement, ReplyBodyProps>(function ReplyBody(
  { state, draft, generating, disabled, onDraftChange, onGenerate },
  draftRef,
) {
  // Merge the forwarded ref (used by the page for focus) with a local one so we
  // can grow the field to fit the whole draft instead of scrolling inside it.
  const localRef = useRef<HTMLTextAreaElement | null>(null)
  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      localRef.current = node
      if (typeof draftRef === 'function') draftRef(node)
      else if (draftRef) draftRef.current = node
    },
    [draftRef],
  )
  useLayoutEffect(() => {
    const el = localRef.current
    if (!el || state !== 'draft') return
    el.style.height = 'auto'
    el.style.height = `${Math.max(160, Math.min(el.scrollHeight, 520))}px`
  }, [draft, state])

  if (state === 'empty') {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-border-2 bg-bg-1 px-[18px] py-4">
        <p className="text-[13px] text-text-3">
          Read the thread, then draft a reply that mentions your product where it genuinely helps.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-accent px-4 py-[9px] text-[13px] font-bold text-accent-text transition-[filter] hover:brightness-[1.06] disabled:pointer-events-none disabled:opacity-60"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> Generate reply
        </button>
      </div>
    )
  }

  if (state === 'generating') {
    return (
      <div className="rounded-[var(--radius)] border border-border-2 bg-bg-1 px-[18px] py-4">
        <p className="mb-2.5 flex items-center gap-2 text-[12px] font-semibold text-accent">
          <span className="h-3 w-3 animate-rs-spin rounded-full border-[1.5px] border-border-2 border-t-accent" aria-hidden />
          Drafting a reply
        </p>
        {['92%', '100%', '74%'].map((w) => (
          <span
            key={w}
            className="mb-2 block h-[11px] animate-rs-shimmer rounded-[4px] last:mb-0"
            style={{
              width: w,
              backgroundImage: 'linear-gradient(90deg, var(--bg-3) 25%, var(--bg-2) 37%, var(--bg-3) 63%)',
              backgroundSize: '600px 100%',
            }}
            aria-hidden
          />
        ))}
      </div>
    )
  }

  // Draft state: editable textarea with a regenerate link + char count.
  return (
    <div className="relative">
      <Textarea
        ref={setRefs}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        disabled={disabled}
        className="min-h-[160px] max-h-[520px] resize-y overflow-y-auto bg-bg-1 leading-[1.6]"
        placeholder="Edit the reply before you copy it."
      />
      <div className="pointer-events-none absolute bottom-2.5 right-3 flex items-center gap-3 text-[11px]">
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || disabled}
          className="pointer-events-auto inline-flex items-center gap-1 text-text-3 transition-colors hover:text-accent disabled:pointer-events-none disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" aria-hidden /> Regenerate
        </button>
        <span
          className="tnum"
          style={{ color: draft.length > FUNNEL.draftMaxChars ? 'var(--status-edited-text)' : 'var(--text-3)' }}
          title={`Limit ${FUNNEL.draftMaxChars} characters`}
        >
          {draft.length} chars
        </span>
      </div>
    </div>
  )
})
