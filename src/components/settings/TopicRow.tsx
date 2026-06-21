import { useState } from 'react'
import { Check } from 'lucide-react'

import { Button, Input, Textarea, Switch, ConfirmModal, SourceChip, useToast, cn } from '../ui'
import { Segmented } from './Segmented'
import { VENUE_OPTIONS } from './venues'
import { pauseTopic, updateTopic, deleteTopic } from '../../lib/api'
import type { DraftMode, TopicData, Venue } from '../../types'

/*
 * One editable topic. Collapsed it shows the name, scan cadence, and a pause
 * toggle; expanded it edits name, cadence, draft mode, venues, and reply voice
 * through updateTopic. Delete asks for confirmation first.
 */
interface TopicRowProps {
  id: string
  topic: TopicData
}

const CADENCE: { value: string; label: string }[] = [
  { value: '1', label: 'Once a day' },
  { value: '2', label: 'Twice' },
  { value: '3', label: '3 times' },
]

const DRAFT_MODES: { value: DraftMode; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'auto', label: 'Auto draft' },
]

export function TopicRow({ id, topic }: TopicRowProps) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Draft of the editable fields; reset to the live topic on each expand.
  const [name, setName] = useState(topic.name)
  const [q1Find, setQ1Find] = useState(topic.q1Find)
  const [q2Promote, setQ2Promote] = useState(topic.q2Promote)
  const [scansPerDay, setScansPerDay] = useState<TopicData['scansPerDay']>(topic.scansPerDay)
  const [draftMode, setDraftMode] = useState<DraftMode>(topic.draftMode)
  const [venues, setVenues] = useState<Venue[]>([...topic.venues])
  const [replyVoice, setReplyVoice] = useState(topic.replyVoice)

  function expand() {
    setName(topic.name)
    setQ1Find(topic.q1Find)
    setQ2Promote(topic.q2Promote)
    setScansPerDay(topic.scansPerDay)
    setDraftMode(topic.draftMode)
    setVenues([...topic.venues])
    setReplyVoice(topic.replyVoice)
    setOpen(true)
  }

  function toggleVenue(v: Venue) {
    setVenues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }

  async function togglePause(next: boolean) {
    const res = await pauseTopic(id, next)
    if (res.success) toast.success(next ? 'Topic paused' : 'Topic resumed')
    else toast.error('Could not update topic', res.error)
  }

  async function save() {
    if (!name.trim() || venues.length === 0) {
      toast.error('Check the fields', 'A name and at least one venue are required.')
      return
    }
    if (!q1Find.trim() || !q2Promote.trim()) {
      toast.error('Check the fields', 'Both setup answers are required.')
      return
    }
    setSaving(true)
    const res = await updateTopic(id, {
      name: name.trim(),
      q1Find: q1Find.trim(),
      q2Promote: q2Promote.trim(),
      scansPerDay,
      draftMode,
      venues,
      replyVoice,
    })
    setSaving(false)
    if (res.success) {
      toast.success('Topic saved')
      setOpen(false)
    } else {
      toast.error('Could not save topic', res.error)
    }
  }

  async function remove() {
    setDeleting(true)
    const res = await deleteTopic(id)
    setDeleting(false)
    setConfirmDelete(false)
    if (res.success) toast.success('Topic deleted')
    else toast.error('Could not delete topic', res.error)
  }

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Collapsed header row */}
      <div className="flex items-center gap-3 px-[18px] py-[14px]">
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : expand())}
          className="min-w-0 flex-1 text-left"
        >
          <div className="truncate text-[13px] font-semibold text-text-1">{topic.name}</div>
          <div className="mt-0.5 text-[12px] text-text-3">
            {topic.scansPerDay}x daily · {topic.venues.length} venue
            {topic.venues.length === 1 ? '' : 's'}
            {topic.paused ? ' · paused' : ''}
          </div>
        </button>
        <div className="flex flex-none items-center gap-2">
          <span className="text-[11px] text-text-3">{topic.paused ? 'Paused' : 'Active'}</span>
          <Switch
            checked={!topic.paused}
            onCheckedChange={(on) => togglePause(!on)}
            aria-label={topic.paused ? 'Resume topic' : 'Pause topic'}
          />
          <Button variant="ghost" size="sm" onClick={() => (open ? setOpen(false) : expand())}>
            {open ? 'Close' : 'Edit'}
          </Button>
        </div>
      </div>

      {/* Expanded editor */}
      {open && (
        <div className="flex animate-rs-in flex-col gap-4 border-t border-border bg-bg-1 px-[18px] py-[16px]">
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.15em] text-text-3">
              Name
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.15em] text-text-3">
              What conversations do you want to find?
            </label>
            <Textarea
              value={q1Find}
              onChange={(e) => setQ1Find(e.target.value)}
              placeholder="What conversations to find for this topic."
              className="min-h-[72px]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.15em] text-text-3">
              What are you promoting, and how do you want to mention it?
            </label>
            <Textarea
              value={q2Promote}
              onChange={(e) => setQ2Promote(e.target.value)}
              placeholder="What you're promoting and how to mention it."
              className="min-h-[72px]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.15em] text-text-3">
              How often
            </label>
            <Segmented
              ariaLabel="Scans per day"
              options={CADENCE}
              value={String(scansPerDay)}
              onChange={(v) => setScansPerDay(Number(v) as TopicData['scansPerDay'])}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.15em] text-text-3">
              Draft mode
            </label>
            <Segmented
              ariaLabel="Draft mode"
              options={DRAFT_MODES}
              value={draftMode}
              onChange={setDraftMode}
            />
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.15em] text-text-3">
              Where to look
            </label>
            <div className="flex flex-wrap gap-2">
              {VENUE_OPTIONS.map(({ venue, source, label, note }) => {
                const on = venues.includes(venue)
                return (
                  <button
                    key={venue}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggleVenue(venue)}
                    className={cn(
                      'inline-flex items-center gap-[9px] rounded-[var(--radius)] border px-[14px] py-[9px] text-[13px] font-semibold transition-all duration-150',
                      on
                        ? 'border-accent bg-accent-soft text-text-1'
                        : 'border-border bg-bg-2 text-text-2 hover:bg-bg-3',
                    )}
                  >
                    <SourceChip source={source} size="sm" />
                    {label}
                    {note && <span className="text-[10px] font-normal text-text-3">{note}</span>}
                    <span
                      className={cn(
                        'grid h-4 w-4 place-content-center rounded-[3px] border',
                        on ? 'border-accent bg-accent text-accent-text' : 'border-border-2',
                      )}
                    >
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.15em] text-text-3">
              Reply voice
            </label>
            <Textarea
              value={replyVoice}
              onChange={(e) => setReplyVoice(e.target.value)}
              placeholder="How replies for this topic should sound."
              className="min-h-[72px]"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete topic
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={saving} onClick={save}>
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Delete this topic?"
        description="This removes the topic and stops its scans. Queued candidates and history are not affected."
        confirmText="Delete topic"
        loading={deleting}
      />
    </div>
  )
}
