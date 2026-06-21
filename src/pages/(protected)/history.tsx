/*
 * History (/history). A grouped, filterable,
 * exportable log of posted/edited/skipped replies. Each decision is joined to
 * its candidate (thread title, source, url) and its topic (name); missing joins
 * fall back gracefully. Export builds from the currently filtered+ranged set.
 */

import { useMemo, useState } from 'react'
import { useQuery } from 'deepspace'
import type { CandidateData, DecisionData, TopicData } from '../../types'
import { useToast } from '../../components/ui'
import {
  HistoryControls,
  type ExportKind,
} from '../../components/history/HistoryControls'
import { HistoryGroup } from '../../components/history/HistoryGroup'
import {
  filterEntries,
  groupEntries,
  toClipboardText,
  toCsv,
  toJson,
} from '../../components/history/format'
import type {
  ActionFilter,
  GroupBy,
  HistoryEntry,
  RangeKey,
} from '../../components/history/types'

type OpenMenu = 'range' | 'export' | null

/** Trigger a client-side file download for export text. */
function downloadFile(filename: string, mime: string, text: string) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function HistoryPage() {
  const decisions = useQuery<DecisionData>('decisions', {
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 200,
  })
  const candidates = useQuery<CandidateData>('candidates')
  const topics = useQuery<TopicData>('topics')
  const { success } = useToast()

  const [groupBy, setGroupBy] = useState<GroupBy>('day')
  const [action, setAction] = useState<ActionFilter>('all')
  const [range, setRange] = useState<RangeKey>('all')
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  // Join each decision to its candidate (title/source/url) and topic (name),
  // falling back when a record is missing so the entry still renders.
  const entries = useMemo<HistoryEntry[]>(() => {
    const candById = new Map(candidates.records.map((c) => [c.recordId, c.data]))
    const topicById = new Map(topics.records.map((t) => [t.recordId, t.data]))
    return decisions.records.map((rec) => {
      const d = rec.data
      const cand = candById.get(d.candidateId)
      const topic = topicById.get(d.topicId)
      return {
        id: rec.recordId,
        action: d.action,
        title: cand?.title ?? 'Thread no longer available',
        source: cand?.source ?? 'reddit',
        url: cand?.url ?? '',
        topic: topic?.name ?? 'Removed topic',
        finalText: d.finalText ?? '',
        createdAt: Date.parse(rec.createdAt) || 0,
      }
    })
  }, [decisions.records, candidates.records, topics.records])

  const filtered = useMemo(
    () => filterEntries(entries, action, range),
    [entries, action, range],
  )
  const groups = useMemo(
    () => groupEntries(filtered, groupBy),
    [filtered, groupBy],
  )

  function handleExport(kind: ExportKind) {
    setOpenMenu(null)
    const count = filtered.length
    const plural = count === 1 ? 'entry' : 'entries'
    if (kind === 'csv') {
      downloadFile('reply-radar-history.csv', 'text/csv', toCsv(filtered))
      success(`Exported ${count} ${plural} as CSV.`)
    } else if (kind === 'json') {
      downloadFile('reply-radar-history.json', 'application/json', toJson(filtered))
      success(`Exported ${count} ${plural} as JSON.`)
    } else {
      void navigator.clipboard?.writeText(toClipboardText(filtered))
      success(`Copied ${count} ${plural} to clipboard.`)
    }
  }

  function copyReply(entry: HistoryEntry) {
    void navigator.clipboard?.writeText(entry.finalText)
    success('Reply copied to clipboard.')
  }

  const loading =
    decisions.status === 'loading' ||
    candidates.status === 'loading' ||
    topics.status === 'loading'

  return (
    <div className="flex h-full flex-col">
      {openMenu && (
        <div
          className="fixed inset-0 z-[15]"
          onClick={() => setOpenMenu(null)}
          aria-hidden
        />
      )}

      <header className="relative z-20 flex h-[54px] flex-none items-center gap-2 border-b border-border px-[18px]">
        <h1 className="font-display text-[17px] font-bold tracking-[-0.02em] text-text-1">
          History
        </h1>
        <span className="tnum whitespace-nowrap text-[12px] text-text-3">
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </span>
        <div className="flex-1" />
        <HistoryControls
          groupBy={groupBy}
          onGroupBy={setGroupBy}
          action={action}
          onAction={setAction}
          range={range}
          onRange={setRange}
          openMenu={openMenu}
          onOpenMenu={setOpenMenu}
          onExport={handleExport}
        />
      </header>

      <div className="rs-scroll flex-1 overflow-y-auto">
        <div className="max-w-[880px] px-6 pb-[60px] pt-[18px]">
          {loading ? (
            <p className="py-16 text-center text-[13px] text-text-3">Loading...</p>
          ) : groups.length === 0 ? (
            <p className="max-w-[360px] py-16 text-[13px] leading-relaxed text-text-3">
              No history yet. Replies you post, edit, or skip from the queue are
              logged here.
            </p>
          ) : (
            groups.map((group) => (
              <HistoryGroup
                key={group.key}
                group={group}
                groupBy={groupBy}
                openId={openId}
                onToggle={(id) => setOpenId((cur) => (cur === id ? null : id))}
                onCopy={copyReply}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
