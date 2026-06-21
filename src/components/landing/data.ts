/*
 * Sample content for the landing demos. Not product data; just believable
 * threads so the animated queue and detail mocks read like the real app.
 * Sources/types reference the shared theme metadata so colors stay on-token.
 */

import type { SourceId, TypeId } from '../../themes'

export interface DemoThread {
  source: SourceId
  sub: string
  age: string
  title: string
  type: TypeId
  score: number
  reason: string
  hasDraft: boolean
}

/** The rows that stream into the hero triage mock, top of queue first. */
export const DEMO_THREADS: DemoThread[] = [
  {
    source: 'reddit',
    sub: 'r/analytics',
    age: '2h',
    title: 'Looking for a privacy-first analytics tool that does not need a cookie banner',
    type: 'question',
    score: 92,
    reason: 'Asking directly for a cookieless analytics tool, which is exactly what you promote.',
    hasDraft: true,
  },
  {
    source: 'hn',
    sub: 'Hacker News',
    age: '5h',
    title: 'Show HN: I gave up on Google Analytics 4 after the migration',
    type: 'discussion',
    score: 84,
    reason: 'Open thread about leaving GA4, a natural place to mention the alternative.',
    hasDraft: false,
  },
  {
    source: 'ih',
    sub: 'indiehackers.com',
    age: '1d',
    title: 'How do I track page views without storing personal data under GDPR',
    type: 'question',
    score: 79,
    reason: 'Technical question where your consent-free tracking is a real answer.',
    hasDraft: false,
  },
  {
    source: 'devto',
    sub: 'dev.to',
    age: '3h',
    title: 'What analytics do small SaaS teams use instead of GA?',
    type: 'discussion',
    score: 77,
    reason: 'Recommendation thread aimed at small teams, your core audience.',
    hasDraft: false,
  },
  {
    source: 'reddit',
    sub: 'r/webdev',
    age: '8h',
    title: 'Cookie consent banners are killing my conversion rate',
    type: 'painpoint',
    score: 88,
    reason: 'A frustration your product removes outright. Strong fit for a helpful reply.',
    hasDraft: false,
  },
]

/** The draft the hero types out, line by line. Grounded, no pitch tone. */
export const DEMO_DRAFT =
  'If the cookie banner is the blocker, a consent-free setup is worth a look. ' +
  'You can measure page views and referrers without storing anything that counts ' +
  'as personal data, so GDPR stops being a banner problem. I run that on a small ' +
  'SaaS and the numbers line up with what GA used to show.'

/** The four pipeline stages for the how-it-works section. */
export const PIPELINE = [
  {
    key: 'describe',
    label: 'Describe',
    line: 'Answer two questions: what to find, and what you would mention.',
  },
  {
    key: 'scan',
    label: 'Scan',
    line: 'Reply Radar searches your venues on a schedule and reads what it finds.',
  },
  {
    key: 'judge',
    label: 'Judge',
    line: 'An AI scores each thread on whether your reply would actually belong.',
  },
  {
    key: 'reply',
    label: 'Reply',
    line: 'You read the thread, edit the draft, and post it yourself by hand.',
  },
] as const
