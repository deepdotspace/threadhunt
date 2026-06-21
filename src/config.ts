/**
 * Reply Radar config. The single editable source for prompts, model ids, funnel
 * tunables, and defaults. The founder tunes numbers here without hunting
 * through code.
 */

import type { DraftMode, DraftModel, Venue } from './types'

// Shared voice rules injected into both the judge and the drafter so the two
// stages reason about the same kind of reply. Plain, specific, no sales tone.
const voiceRules = [
  'Write like a real person who knows the topic, not like marketing copy.',
  'Be specific and concrete. Reference details from the thread you are replying to.',
  'Lead with the help. Mention the product only when it genuinely fits the question.',
  'Do not open with "have you tried". Do not pitch. Do not use hype words.',
  'Keep it short and direct. No filler, no preamble, no sign-off.',
  'Never use em dashes. Use a period or a comma instead.',
].join('\n')

export const PROMPTS = {
  voiceRules,

  // Turns Q1 into a set of search queries. Returns a JSON array of strings.
  queryGen: [
    'You generate web search queries that find online discussions a person could reply to.',
    'You are given what the user wants to find. Produce search queries that surface real threads',
    'where someone is asking about or discussing that topic and would welcome a helpful reply.',
    '',
    'Rules:',
    '- Return only a JSON array of plain query strings, nothing else.',
    '- Each query is words a person would actually search, not a sentence.',
    '- Cover different angles and phrasings, including problems, comparisons, and questions.',
    '- Do not add site filters or operators. Do not use quotes around the whole query.',
    '- No em dashes anywhere.',
  ].join('\n'),

  // Scores one thread against BOTH setup answers. Returns score + reason + type.
  judge: [
    'You decide whether an online thread is a good place for one specific user to post a reply.',
    'You are given Q1 (the kind of conversation they want to find) and Q2 (what they promote and how',
    'they want it to come up), then a real thread: its title, an excerpt, and highlighted passages.',
    '',
    'Judge the reply opportunity, not just topical overlap. Ask two things:',
    '1. Could a reply genuinely help or add value to this exact thread, on its own terms?',
    '2. Could the product come up honestly in that reply, as a direct answer or as a natural aside?',
    'Assume the reply will be helpful and not salesy, since that is the only kind that gets posted.',
    'Judge whether even a good-faith, useful reply belongs here.',
    '',
    'Score 0 to 10:',
    '- 8 to 10: someone is asking, comparing, or hitting a problem the product directly addresses, and',
    '  a helpful reply that mentions it would be welcome and on point.',
    '- 6 to 7: adjacent or tangential, but there is a real and honest angle. You can add genuine value',
    '  and the product fits naturally as part of that help, even though no one asked for it directly.',
    '- 4 to 5: on topic but thin. A reply could exist, but the product mention would be a stretch, or it',
    '  is a broadcast with little to answer, or engagement is low.',
    '- 0 to 3: nothing real to add, pure marketing or an announcement with no opening, hostile to',
    '  recommendations, already resolved, or so centered on a competitor that a mention would hijack it.',
    '',
    'Reward a clever, honest angle on a tangential thread. Do not reward forcing the product in where the',
    'only way to mention it is to hijack the conversation.',
    '',
    'Classify the thread type:',
    '- question: someone is asking for help or a recommendation.',
    '- painpoint: someone is describing a problem or frustration.',
    '- discussion: an open conversation or opinion thread.',
    '',
    'The reason must name the angle in one line: how a reply would help and where the product fits. Be',
    'honest with the score so the user can sort threads by it.',
    '',
    'Return only JSON: {"score": <0-10 integer>, "reason": "<one short line, no em dashes>",',
    '"type": "question" | "discussion" | "painpoint"}.',
  ].join('\n'),

  // Writes a reply draft for a queued thread, using Q2 and the topic voice.
  draft: [
    'You write a reply to post on the thread shown below.',
    'You are given what the user is promoting and how they want to mention it, the topic voice,',
    'and the thread title and excerpt. Write a reply that helps the person first and mentions the',
    'product only where it genuinely fits.',
    '',
    'Rules:',
    '- Answer the actual thread. Reference specifics from it.',
    '- Mention the product once, naturally, only if it helps. Otherwise leave it out.',
    '- Return only the reply text, no quotes, no labels, no preamble.',
    '',
    voiceRules,
  ].join('\n'),
} as const

export const MODELS = {
  judge: 'claude-haiku-4-5',
  draft: 'claude-sonnet-4-6',
  // User-selectable draft models; the chosen one writes reply drafts.
  draftModels: { haiku: 'claude-haiku-4-5', sonnet: 'claude-sonnet-4-6', opus: 'claude-opus-4-8' } as Record<DraftModel, string>,
  draftMaxOutputTokens: 400,
  // Query generation returns a JSON array of ~10 queries; needs more room than
  // the judge, or the array truncates with no closing bracket and parses to [].
  queryGenMaxOutputTokens: 512,
  // Batch judging returns one verdict per thread in an array; needs more room
  // than a single judge call.
  judgeBatchMaxOutputTokens: 1500,
} as const

export const FUNNEL = {
  queriesPerTopic: 8, // the quality lever, not results per query
  // The scan runs as a chunked background job, so it judges a real budget across
  // alarm ticks rather than the old inline 25-thread cap; chunk sizes (below)
  // keep each tick under the Worker subrequest ceiling.
  maxTopicsPerTick: 1, // one due topic per hourly tick (subrequest budget)
  scoreThreshold: 5, // judge score below this is dropped and remembered
  draftMinChars: 50,
  draftMaxChars: 1200,
  // Per-venue search: one search per venue per query, recency-bounded.
  resultsPerVenueQuery: 30, // per venue per query (per-venue scales to ~60; 30 = headroom)
  recencyDaysFirstRun: 90, // first scan: wide window for the backlog
  recencyDaysOngoing: 14, // later scans: fresh window
  // Background-job judging removes the old inline 25 cap.
  judgeBudgetPerScan: 90, // max threads judged per scan
  judgeBatchSize: 10, // threads per Haiku judge call
  // Job chunking: stay under the worker subrequest ceiling per alarm tick.
  searchesPerChunk: 8, // searches before yielding
  judgeThreadsPerChunk: 20, // threads judged before yielding
} as const

export const DEFAULTS = {
  venues: ['reddit', 'hackernews'] as Venue[],
  scansPerDay: 1 as 1 | 2 | 3,
  draftMode: 'manual' as DraftMode,
} as const

// Venue -> the domain used in the Google `site:` search through Firecrawl.
export const VENUE_DOMAINS: Record<Venue, string> = {
  reddit: 'reddit.com',
  hackernews: 'news.ycombinator.com',
  x: 'x.com',
  indiehackers: 'indiehackers.com',
  devto: 'dev.to',
}
