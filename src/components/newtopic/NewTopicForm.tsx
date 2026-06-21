import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button, Input, Textarea, useToast } from '../ui'
import { DEFAULTS } from '../../config'
import { createTopic } from '../../lib/api'
import type { DraftMode, DraftModel, Venue } from '../../types'

import { Field } from './Field'
import { QueryEditor } from './QueryEditor'
import { Segmented } from './Segmented'
import { VenuePicker } from './VenuePicker'

const FREQ_OPTIONS = [
  { value: '1', label: 'Once a day' },
  { value: '2', label: 'Twice' },
  { value: '3', label: 'Three times' },
] as const

const MODE_OPTIONS: { value: DraftMode; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'auto', label: 'Auto draft' },
]

const MODE_HINT: Record<DraftMode, string> = {
  manual: 'Candidates queue with no draft. You generate a reply when you review.',
  auto: 'Each candidate is drafted during the scan, ready to edit and post.',
}

const MODEL_OPTIONS: { value: DraftModel; label: string }[] = [
  { value: 'haiku', label: 'Haiku' },
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus', label: 'Opus' },
]

/** First few words of Q1, capitalized, as a sensible default topic name. */
function deriveName(q1: string): string {
  const trimmed = q1.trim().split(/\s+/).slice(0, 4).join(' ')
  if (!trimmed) return 'New topic'
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export function NewTopicForm() {
  const navigate = useNavigate()
  const { error: toastError } = useToast()

  const [name, setName] = useState('')
  const [q1, setQ1] = useState('')
  const [q2, setQ2] = useState('')
  const [queries, setQueries] = useState<string[]>([])
  const [venues, setVenues] = useState<Venue[]>([...DEFAULTS.venues])
  const [scansPerDay, setScansPerDay] = useState<1 | 2 | 3>(DEFAULTS.scansPerDay)
  const [timeOfDay, setTimeOfDay] = useState('')
  const [draftMode, setDraftMode] = useState<DraftMode>(DEFAULTS.draftMode)
  const [draftModel, setDraftModel] = useState<DraftModel>('sonnet')
  const [replyVoice, setReplyVoice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = q1.trim().length > 0 && q2.trim().length > 0 && !submitting

  function toggleVenue(venue: Venue) {
    setVenues((prev) =>
      prev.includes(venue) ? prev.filter((v) => v !== venue) : [...prev, venue],
    )
  }

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const trimmedTime = timeOfDay.trim()
      const res = await createTopic({
        name: name.trim() || deriveName(q1),
        q1Find: q1.trim(),
        q2Promote: q2.trim(),
        queries: queries.length ? queries : undefined,
        venues,
        scansPerDay,
        timeOfDay: trimmedTime || null,
        draftMode,
        draftModel,
        replyVoice: replyVoice.trim() || undefined,
      })
      if (!res.success || !res.data) {
        toastError('Could not create topic', res.error ?? 'Please try again.')
        setSubmitting(false)
        return
      }
      navigate(`/topics/${res.data.topicId}`, { state: { scanJobId: res.data.jobId ?? null } })
    } catch (err) {
      toastError('Could not create topic', err instanceof Error ? err.message : 'Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="rs-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-[720px] px-8 pb-20 pt-10 [animation:rs-in_0.3s_ease]">
        <Link
          to="/topics"
          className="text-[12.5px] text-text-3 transition-colors hover:text-text-1"
        >
          ← Back
        </Link>
        <h1 className="mb-1 mt-1.5 font-display text-[30px] font-bold tracking-[-0.02em] text-text-1">
          New topic
        </h1>
        <p className="mb-7 text-[14px] text-text-3">
          Answer two questions. We turn them into search queries and start scanning.
        </p>

        <div className="flex flex-col gap-[22px]">
          <Field number={1} label="What conversations do you want to find?">
            <Textarea
              value={q1}
              onChange={(e) => setQ1(e.target.value)}
              placeholder="People looking for a privacy friendly alternative to Google Analytics"
              className="min-h-[64px] resize-y"
            />
          </Field>

          <Field number={2} label="What are you promoting, and how do you want to mention it?">
            <Textarea
              value={q2}
              onChange={(e) => setQ2(e.target.value)}
              placeholder="Tallymark, a cookieless analytics tool. Mention it as one option among others, only when someone asks for alternatives. Never lead with it."
              className="min-h-[64px] resize-y"
            />
          </Field>

          <div className="h-px bg-border" />

          <Field label="Where to look">
            <VenuePicker selected={venues} onToggle={toggleVenue} />
          </Field>

          <div className="flex flex-wrap gap-8">
            <Field label="How often">
              <Segmented
                ariaLabel="Scan frequency"
                options={FREQ_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={String(scansPerDay)}
                onChange={(v) => setScansPerDay(Number(v) as 1 | 2 | 3)}
              />
            </Field>
            <Field label="Around" optional>
              <Input
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                placeholder="9:00 AM"
                aria-label="Preferred time of day"
                className="w-[120px] py-2 text-[13px]"
              />
            </Field>
          </div>

          <Field label="Draft mode">
            <Segmented
              ariaLabel="Draft mode"
              options={MODE_OPTIONS}
              value={draftMode}
              onChange={setDraftMode}
            />
            <p className="mt-2.5 text-[12.5px] text-text-3">{MODE_HINT[draftMode]}</p>
          </Field>

          <Field label="Reply model">
            <Segmented
              ariaLabel="Reply model"
              options={MODEL_OPTIONS}
              value={draftModel}
              onChange={setDraftModel}
            />
            <p className="mt-2.5 text-[12.5px] text-text-3">
              Pricier models write better replies.
            </p>
          </Field>

          <Field label="Reply voice" optional>
            <Textarea
              value={replyVoice}
              onChange={(e) => setReplyVoice(e.target.value)}
              placeholder="How replies should sound. e.g. Plain and direct, first person, one short paragraph, no hype."
              className="min-h-[64px] resize-y"
            />
          </Field>

          <Field label="Search queries" optional>
            <QueryEditor queries={queries} onChange={setQueries} />
          </Field>

          <Field label="Topic name" optional>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={deriveName(q1)}
              aria-label="Topic name"
              className="max-w-[360px] py-2 text-[13px]"
            />
          </Field>

          <div className="mt-1.5 flex items-center gap-3.5">
            <Button
              variant="primary"
              size="lg"
              onClick={submit}
              disabled={!canSubmit}
              loading={submitting}
              className="px-[22px] py-[11px]"
            >
              Create topic and scan
            </Button>
            <span className="text-[12.5px] text-text-3">
              First results usually arrive within a minute.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
