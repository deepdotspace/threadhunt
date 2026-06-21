/**
 * Thin client wrappers around server actions (POST /api/actions/:name). Clients
 * never write records directly; every mutation flows through these actions,
 * which verify ownership and bypass RBAC server-side. Each returns the action
 * envelope { success, data?, error? } so callers can branch and toast.
 */

import { getAuthToken } from 'deepspace'
import type { DraftMode, DraftModel, TopicData, Venue } from '../types'

export interface ActionEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

async function callAction<T>(name: string, body: unknown): Promise<ActionEnvelope<T>> {
  const token = await getAuthToken()
  const res = await fetch(`/api/actions/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  let json: ActionEnvelope<T>
  try {
    json = (await res.json()) as ActionEnvelope<T>
  } catch {
    throw new Error(`Request failed (${res.status})`)
  }
  if (!res.ok && json?.success === undefined) {
    throw new Error(json?.error || `Request failed (${res.status})`)
  }
  return json
}

export interface NewTopicInput {
  name: string
  q1Find: string
  q2Promote: string
  queries?: string[]
  venues?: Venue[]
  scansPerDay?: 1 | 2 | 3
  timeOfDay?: string | null
  draftMode?: DraftMode
  draftModel?: DraftModel
  replyVoice?: string
}

/** Create a topic owned by the caller; queries are generated server-side if omitted. */
export function createTopic(input: NewTopicInput) {
  return callAction<{ topicId: string; jobId?: string; topic: TopicData }>('createTopic', input)
}

/** Draft a reply for a queued candidate. */
export function generateDraft(candidateId: string, model?: DraftModel, instruction?: string) {
  return callAction<{ draft: string }>('generateDraft', { candidateId, model, instruction })
}

/** Record a posted or skipped outcome and log a decision. */
export function reviewCandidate(params: {
  candidateId: string
  action: 'posted' | 'skipped'
  finalText?: string
}) {
  return callAction<{ status: 'posted' | 'skipped' }>('reviewCandidate', params)
}

/** Enqueue a background scan job for one topic now; returns the job id to track. */
export function runScanNow(topicId: string) {
  return callAction<{ jobId: string }>('runScanNow', { topicId })
}

export function pauseTopic(topicId: string, paused: boolean) {
  return callAction<unknown>('pauseTopic', { topicId, paused })
}

export function updateTopic(topicId: string, patch: Partial<TopicData>) {
  return callAction<unknown>('updateTopic', { topicId, patch })
}

export function deleteTopic(topicId: string) {
  return callAction<unknown>('deleteTopic', { topicId })
}

/** Owner/dev only: seed sample topics, candidates, and decisions for verification. */
export function seedSampleData() {
  return callAction<{ topics: number; candidates: number; decisions: number }>('seedSampleData', {})
}
