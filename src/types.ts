/**
 * Reply Radar data model.
 *
 * The `*Data` shapes are the values stored under a record envelope's `.data`.
 * Every record is `{ recordId, data: T, createdBy, createdAt, updatedAt }`;
 * these types describe only the `.data` payload.
 */

/** A place where a human can read a thread and post a reply. */
export type Venue = 'reddit' | 'hackernews' | 'x' | 'indiehackers' | 'devto'

/** Manual queues a candidate with no draft; auto drafts during the scan. */
export type DraftMode = 'manual' | 'auto'

/** Which model writes reply drafts. */
export type DraftModel = 'haiku' | 'sonnet' | 'opus'

/** Lifecycle of a discovered candidate. */
export type CandidateStatus = 'queued' | 'posted' | 'skipped'

/** What the judge decided a thread is, used for filtering in the queue. */
export type ConversationType = 'question' | 'discussion' | 'painpoint'

/** Outcome the user logged for a candidate. */
export type DecisionAction = 'posted' | 'edited' | 'skipped'

/** One thing the user tracks: setup answers, queries, schedule, and state. */
export interface TopicData {
  name: string
  q1Find: string
  q2Promote: string
  queries: string[]
  venues: Venue[]
  scansPerDay: 1 | 2 | 3
  timeOfDay: string | null
  draftMode: DraftMode
  // Optional: older rows and unset columns read as undefined; readers default to 'sonnet'.
  draftModel?: DraftModel
  replyVoice: string
  paused: boolean
  nextDueAt: number
  lastScanAt: number
  ownerUserId: string
}

/** One discovered thread worth replying to, with the judge's verdict. */
export interface CandidateData {
  topicId: string
  url: string
  source: Venue
  subsection: string
  title: string
  author: string
  excerpt: string
  highlights: string[]
  publishedAt: number
  score: number
  reason: string
  type: ConversationType
  draftText: string
  status: CandidateStatus
  ownerUserId: string
}

/** A logged outcome for a candidate, with the final reply text. */
export interface DecisionData {
  candidateId: string
  topicId: string
  action: DecisionAction
  finalText: string
  actorUserId: string
}

/** Per-topic guard so each url is judged exactly once, ever. */
export interface SeenUrlData {
  topicId: string
  url: string
  judgedAt: number
}
