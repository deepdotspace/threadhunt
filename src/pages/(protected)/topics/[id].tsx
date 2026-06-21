/*
 * Queue (/topics/:id) — the core two-pane triage inbox for one topic
 *. Left = source/type filters + a dense list of
 * queued candidates. Right = the detail pane: read the thread, generate or edit
 * a draft, then Copy and open / Mark posted / Skip. Keyboard (j/k/e/x/p) layers
 * over fully working mouse controls. Clients are read-only; every mutation goes
 * through a server action.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useQuery, useJobs } from 'deepspace'
import type { RecordData } from 'deepspace'
import type { CandidateData, DraftModel, TopicData, Venue } from '../../../types'
import type { ScanStats } from '../../../server/engine-types'
import { SCOPE_ID } from '../../../constants'
import { generateDraft, reviewCandidate, runScanNow } from '../../../lib/api'
import { ResizeDivider, useToast } from '../../../components/ui'
import { QueueToolbar, type SourceFilter, type TypeFilter, type SortKey } from '../../../components/queue/QueueToolbar'
import { QueueRow } from '../../../components/queue/QueueRow'
import { CandidatePane, type ReplyMode, type ReplyState } from '../../../components/queue/CandidatePane'
import { CaughtUp, Scanning, QueueSkeleton } from '../../../components/queue/QueueStates'
import { UndoToast, FlashToast } from '../../../components/queue/QueueToasts'
import { nextScanLabel } from '../../../components/queue/sourceMeta'

// Stable venue order so the source filter never reshuffles as the list changes.
const VENUE_ORDER: Venue[] = ['reddit', 'hackernews', 'indiehackers', 'devto', 'x']

export default function TopicQueuePage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { records: topics, status: topicStatus } = useQuery<TopicData>('topics')
  const { records: candidates, status: candidateStatus } = useQuery<CandidateData>('candidates', {
    where: { topicId: id, status: 'queued' },
    orderBy: 'createdAt',
    orderDir: 'desc',
  })
  const { success, error: toastError } = useToast()

  const topic = useMemo(() => topics.find((t) => t.recordId === id), [topics, id])

  // Resizable list pane: drag the divider to size the panes; width is persisted.
  const splitRef = useRef<HTMLDivElement>(null)
  const [listWidth, setListWidth] = useState(() => {
    const v = Number(localStorage.getItem('reply-radar-queue-list-width'))
    return v >= 340 && v <= 720 ? v : 452
  })
  const handleListResize = useCallback((clientX: number) => {
    const rect = splitRef.current?.getBoundingClientRect()
    if (!rect) return
    const w = Math.max(340, Math.min(720, clientX - rect.left))
    setListWidth(w)
    try {
      localStorage.setItem('reply-radar-queue-list-width', String(w))
    } catch {
      /* ignore */
    }
  }, [])

  // ── Local triage state ──────────────────────────────────────────────────
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sort, setSort] = useState<SortKey>('best')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [fadingId, setFadingId] = useState<string | null>(null)

  const [mode, setMode] = useState<ReplyMode>('manual')
  const [genModel, setGenModel] = useState<DraftModel>('sonnet')
  const [genInstruction, setGenInstruction] = useState('')
  const [replyState, setReplyState] = useState<ReplyState>('empty')
  const [draft, setDraft] = useState('')
  const [generating, setGenerating] = useState(false)
  const [posting, setPosting] = useState(false)
  const [skipping, setSkipping] = useState(false)

  const [undo, setUndo] = useState<{ id: string } | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Scan now enqueues a background job; track it via useJobs and derive the
  // scanning flag from whether a job is in flight (not a manual boolean). The
  // create flow hands off its first-scan job id so it shows as running on open.
  const [scanJobId, setScanJobId] = useState<string | null>(
    () => (location.state as { scanJobId?: string } | null)?.scanJobId ?? null,
  )
  const { getJob } = useJobs(SCOPE_ID)
  const scanJob = scanJobId ? getJob(scanJobId) : null
  const scanning = scanJobId !== null

  const draftRef = useRef<HTMLTextAreaElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Candidates still in play: not optimistically removed this session.
  const live = useMemo(
    () => candidates.filter((c) => !removed.has(c.recordId)),
    [candidates, removed],
  )

  // Venues present across all live items (drives which source pills show).
  const presentVenues = useMemo(() => {
    const seen = new Set<Venue>(live.map((c) => c.data.source))
    return VENUE_ORDER.filter((v) => seen.has(v))
  }, [live])

  // The visible list after both filters, then sorted. 'newest' keeps the query's
  // createdAt-desc order; 'best' sorts a copy by score desc, tie-break newest.
  const visible = useMemo(() => {
    const filtered = live.filter((c) => {
      if (sourceFilter !== 'all' && c.data.source !== sourceFilter) return false
      if (typeFilter !== 'all' && c.data.type !== typeFilter) return false
      return true
    })
    if (sort !== 'best') return filtered
    return [...filtered].sort((a, b) => {
      if (b.data.score !== a.data.score) return b.data.score - a.data.score
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [live, sourceFilter, typeFilter, sort])

  // Keep a valid selection: default to the first visible item, and recover when
  // the selected one leaves the filtered list (mirrors auto-advance on action).
  useEffect(() => {
    if (visible.length === 0) {
      if (selectedId !== null) setSelectedId(null)
      return
    }
    if (!selectedId || !visible.some((c) => c.recordId === selectedId)) {
      setSelectedId(visible[0].recordId)
    }
  }, [visible, selectedId])

  const selected = useMemo(
    () => visible.find((c) => c.recordId === selectedId) ?? null,
    [visible, selectedId],
  )

  // Reset the reply area whenever the selected candidate changes. In auto mode,
  // or when the candidate already has a draft, pre-fill it; manual starts empty.
  const selectedRecordId = selected?.recordId
  useEffect(() => {
    if (!selected) {
      setReplyState('empty')
      setDraft('')
      return
    }
    const existing = selected.data.draftText ?? ''
    const startMode: ReplyMode = topic?.data.draftMode ?? 'manual'
    setMode(startMode)
    // Default to the topic's chosen model; the user can override per candidate.
    setGenModel(topic?.data.draftModel ?? 'sonnet')
    setGenInstruction('')
    if (existing.trim() || startMode === 'auto') {
      setDraft(existing)
      setReplyState(existing.trim() ? 'draft' : 'empty')
    } else {
      setDraft('')
      setReplyState('empty')
    }
    setGenerating(false)
    setPosting(false)
    setSkipping(false)
    setCopied(false)
    // Intentionally keyed only on the selected id; pulling in topic/selected
    // would re-reset the editor mid-edit on every keystroke.
  }, [selectedRecordId])

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [])

  // Switching to Auto draft surfaces a stored draft if one exists; Manual with
  // no edits returns to the empty Generate prompt. Never discards user edits.
  function handleModeChange(nextMode: ReplyMode) {
    setMode(nextMode)
    if (!selected) return
    const stored = selected.data.draftText ?? ''
    if (nextMode === 'auto' && replyState === 'empty' && stored.trim()) {
      setDraft(stored)
      setReplyState('draft')
    }
  }

  function selectByOffset(offset: number) {
    if (!selected) return
    const idx = visible.findIndex((c) => c.recordId === selected.recordId)
    if (idx === -1) return
    const next = visible[idx + offset]
    if (next) setSelectedId(next.recordId)
  }

  function showFlash(label: string) {
    setFlash(label)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 2600)
  }

  // The candidate that should be selected once `id` leaves the visible list.
  function advanceTarget(removingId: string): string | null {
    const idx = visible.findIndex((c) => c.recordId === removingId)
    if (idx === -1) return null
    const next = visible[idx + 1] ?? visible[idx - 1]
    return next ? next.recordId : null
  }

  // ── Generate ───────────────────────────────────────────────────────────
  // Bail if a generation is already running so a second click does not run two
  // drafts at once; the button is disabled while generating.
  const handleGenerate = useCallback(async () => {
    if (!selected || generating) return
    const target = selected
    setGenerating(true)
    setReplyState('generating')
    try {
      const res = await generateDraft(target.recordId, genModel, genInstruction.trim() || undefined)
      if (!res.success || !res.data) {
        setReplyState(draft.trim() ? 'draft' : 'empty')
        toastError('Could not generate a reply', res.error || 'Try again.')
        return
      }
      setDraft(res.data.draft)
      setReplyState('draft')
      // Focus the editable draft so j/k stay paused while the user edits.
      requestAnimationFrame(() => draftRef.current?.focus())
    } catch (e) {
      toastError('Could not generate a reply', e instanceof Error ? e.message : 'Try again.')
      setReplyState(draft.trim() ? 'draft' : 'empty')
    } finally {
      setGenerating(false)
    }
  }, [selected, generating, draft, genModel, genInstruction, toastError])

  // ── Copy and open ────────────────────────────────────────────────────────
  const handleCopyOpen = useCallback(async () => {
    if (!selected || replyState !== 'draft') return
    const text = draft.trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      showFlash('Copied. Thread opened in a new tab.')
    } catch {
      toastError('Could not copy automatically', 'Select the draft, copy it, then paste in the thread.')
    }
    if (selected.data.url) window.open(selected.data.url, '_blank', 'noopener,noreferrer')
  }, [selected, replyState, draft, toastError])

  // ── Skip: optimistic fade + undo, then review skipped ──────────────────────
  const handleSkip = useCallback(async () => {
    if (!selected || posting || skipping) return
    const target = selected
    setSkipping(true)
    setFadingId(target.recordId)
    const nextId = advanceTarget(target.recordId)
    // After the fade, drop it from the list and advance.
    setTimeout(() => {
      setRemoved((prev) => new Set(prev).add(target.recordId))
      setFadingId(null)
      if (nextId) setSelectedId(nextId)
    }, 300)

    // Undo toast (restores the row) for 5.2s.
    setUndo({ id: target.recordId })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setUndo(null), 5200)

    try {
      const res = await reviewCandidate({ candidateId: target.recordId, action: 'skipped' })
      if (!res.success) throw new Error(res.error || 'Could not skip this thread.')
    } catch (e) {
      // Roll back the optimistic removal so the user can retry.
      setRemoved((prev) => {
        const next = new Set(prev)
        next.delete(target.recordId)
        return next
      })
      setUndo(null)
      setSelectedId(target.recordId)
      toastError('Could not skip', e instanceof Error ? e.message : 'Try again.')
    } finally {
      setSkipping(false)
    }
  }, [selected, posting, skipping, visible, toastError])

  function handleUndo() {
    if (!undo) return
    const restoreId = undo.id
    setRemoved((prev) => {
      const next = new Set(prev)
      next.delete(restoreId)
      return next
    })
    setSelectedId(restoreId)
    setUndo(null)
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }

  // ── Mark posted: review posted, then drop + auto-advance ───────────────────
  const handleMarkPosted = useCallback(async () => {
    if (!selected || replyState !== 'draft' || posting || skipping) return
    const target = selected
    const text = draft.trim()
    setPosting(true)
    const nextId = advanceTarget(target.recordId)
    try {
      const res = await reviewCandidate({
        candidateId: target.recordId,
        action: 'posted',
        finalText: text,
      })
      if (!res.success) {
        toastError('Could not mark posted', res.error || 'Try again.')
        setPosting(false)
        return
      }
      showFlash('Marked posted. Logged to History.')
      setFadingId(target.recordId)
      setTimeout(() => {
        setRemoved((prev) => new Set(prev).add(target.recordId))
        setFadingId(null)
        if (nextId) setSelectedId(nextId)
      }, 300)
    } catch (e) {
      toastError('Could not mark posted', e instanceof Error ? e.message : 'Try again.')
      setPosting(false)
    }
  }, [selected, replyState, posting, skipping, draft, visible, toastError])

  // ── Run scan now: enqueue the background job, then track it below ────────────
  const handleScanNow = useCallback(async () => {
    if (!id || scanning) return
    try {
      const res = await runScanNow(id)
      if (res.success && res.data?.jobId) {
        setScanJobId(res.data.jobId)
      } else {
        toastError('Scan failed', res.error || 'Try again.')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      toastError('Scan failed', msg || 'Try again.')
    }
  }, [id, scanning, toastError])

  // Toast the scan job's outcome once it reaches a terminal state, then clear
  // the tracked id so the button re-enables. The list updates live via useQuery.
  useEffect(() => {
    if (!scanJob) return
    if (scanJob.status === 'succeeded') {
      const r = scanJob.result as ScanStats | undefined
      success('Scan complete', `${r?.queued ?? 0} queued from ${r?.judged ?? 0} judged, ${r?.found ?? 0} found.`)
      setScanJobId(null)
    } else if (scanJob.status === 'failed') {
      toastError('Scan failed', scanJob.error || 'Try again.')
      setScanJobId(null)
    } else if (scanJob.status === 'canceled') {
      setScanJobId(null)
    }
  }, [scanJob?.status, scanJob, success, toastError])

  // ── Keyboard: j/k move, e generate, x skip, p post; paused while typing ────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target
      if (el instanceof HTMLElement && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable)) {
        return
      }
      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault()
          selectByOffset(1)
          break
        case 'k':
        case 'ArrowUp':
          e.preventDefault()
          selectByOffset(-1)
          break
        case 'e':
          if (replyState === 'empty' && !generating) {
            e.preventDefault()
            void handleGenerate()
          }
          break
        case 'x':
          e.preventDefault()
          void handleSkip()
          break
        case 'p':
          if (replyState === 'draft') {
            e.preventDefault()
            void handleMarkPosted()
          }
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectByOffset, handleGenerate, handleSkip, handleMarkPosted, replyState, generating])

  // ── Render ─────────────────────────────────────────────────────────────
  if (topicStatus === 'loading' || candidateStatus === 'loading') {
    return (
      <>
        <QueueHeader title={topic?.data.name ?? 'Queue'} next={null} scanning={false} onScanNow={() => {}} />
        <QueueSkeleton />
      </>
    )
  }

  if (!topic) return <Navigate to="/topics" replace />

  const nextScan = nextScanLabel(topic.data.nextDueAt)

  return (
    <>
      <QueueHeader
        title={topic.data.name}
        next={topic.data.nextDueAt}
        scanning={scanning}
        scanLabel={scanJob?.progressMessage}
        onScanNow={() => void handleScanNow()}
      />

      <div ref={splitRef} className="flex min-h-0 flex-1">
        {/* List pane (resizable) */}
        <section className="flex flex-none flex-col bg-bg-1" style={{ width: listWidth }}>
          <QueueToolbar
            venues={presentVenues}
            sourceFilter={sourceFilter}
            typeFilter={typeFilter}
            sort={sort}
            count={visible.length}
            onSourceFilter={setSourceFilter}
            onTypeFilter={setTypeFilter}
            onSort={setSort}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {visible.map((c) => (
              <QueueRow
                key={c.recordId}
                candidate={c}
                selected={c.recordId === selectedId}
                fading={c.recordId === fadingId}
                onSelect={() => setSelectedId(c.recordId)}
              />
            ))}
            {visible.length === 0 && live.length > 0 && (
              <p className="px-4 py-10 text-center text-[13px] text-text-3">
                No threads match these filters.
              </p>
            )}
            <div className="h-10" />
          </div>
        </section>

        <ResizeDivider onResize={handleListResize} />

        {/* Detail pane */}
        <section className="relative flex min-w-0 flex-1 flex-col bg-bg-1">
          {selected ? (
            <CandidatePane
              ref={draftRef}
              candidate={selected as RecordData<CandidateData>}
              replyState={replyState}
              mode={mode}
              draft={draft}
              posting={posting}
              skipping={skipping}
              copied={copied}
              generating={generating}
              model={genModel}
              onModelChange={setGenModel}
              instruction={genInstruction}
              onInstructionChange={setGenInstruction}
              onModeChange={handleModeChange}
              onDraftChange={setDraft}
              onGenerate={() => void handleGenerate()}
              onCopyOpen={() => void handleCopyOpen()}
              onMarkPosted={() => void handleMarkPosted()}
              onSkip={() => void handleSkip()}
            />
          ) : scanning ? (
            <Scanning message={scanJob?.progressMessage} />
          ) : (
            <CaughtUp nextScan={nextScan} scanning={scanning} onScanNow={() => void handleScanNow()} />
          )}

          {undo && <UndoToast label="Skipped one thread" onUndo={handleUndo} />}
          {flash && !undo && <FlashToast label={flash} />}
        </section>
      </div>
    </>
  )
}

/** Queue header: topic name, next scan + Scan now. */
function QueueHeader({
  title,
  next,
  scanning,
  scanLabel,
  onScanNow,
}: {
  title: string
  next: number | null
  scanning: boolean
  scanLabel?: string
  onScanNow: () => void
}) {
  return (
    <header className="flex h-[54px] flex-none items-center gap-2.5 border-b border-border bg-bg-1 px-[18px]">
      <h1 className="font-display text-[17px] font-bold tracking-[-0.02em] text-text-1">{title}</h1>
      <div className="flex-1" />
      {next !== null && (
        <span className="hidden shrink-0 text-[12px] text-text-3 sm:inline">Next scan {nextScanLabel(next)}</span>
      )}
      <button
        type="button"
        onClick={onScanNow}
        disabled={scanning}
        title="Scan now for new matches"
        className="inline-flex shrink-0 items-center gap-2 rounded-[var(--radius)] border border-border bg-bg-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 transition-colors hover:bg-bg-3 hover:text-text-1 disabled:pointer-events-none disabled:opacity-60"
      >
        {scanning && (
          <span className="h-3 w-3 animate-rs-spin rounded-full border-[1.5px] border-border-2 border-t-accent" aria-hidden />
        )}
        {scanning ? scanLabel || 'Scanning' : 'Scan now'}
      </button>
    </header>
  )
}
