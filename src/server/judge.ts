/**
 * Relevance + quality judge. One Haiku call scores a batch of threads against
 * BOTH setup answers (Q1 what to find, Q2 what to promote), so it judges whether
 * a reply that fits Q2 belongs here, not just topical match. Returns a score +
 * one-line reason + a conversation type per thread, parsed defensively.
 */

import { generateText } from 'ai'
import { createDeepSpaceAI } from 'deepspace/worker'
import { PROMPTS, MODELS } from '../config'
import type { Env } from '../../worker'
import type { ConversationType } from '../types'
import type { RawResult } from './engine-types'

export interface JudgeVerdict {
  score: number
  reason: string
  type: ConversationType
}

const TYPES: ConversationType[] = ['question', 'discussion', 'painpoint']

function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : parseInt(String(n), 10)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(10, Math.round(v)))
}

function asType(v: unknown): ConversationType {
  return TYPES.includes(v as ConversationType) ? (v as ConversationType) : 'discussion'
}

const EMPTY_VERDICT: JudgeVerdict = { score: 0, reason: '', type: 'discussion' }

/** Pull the first JSON array out of model text, tolerant of stray prose. */
function extractArray(text: string): unknown[] | null {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return null
  try {
    const arr = JSON.parse(text.slice(start, end + 1))
    return Array.isArray(arr) ? arr : null
  } catch {
    return null
  }
}

// Judge many threads in one Haiku call, reusing the single-thread calibration.
// Returns a verdict array aligned 1:1 with `threads`; missing/invalid -> score 0.
export async function judgeBatch(
  env: Env,
  args: { q1Find: string; q2Promote: string; threads: RawResult[] },
): Promise<JudgeVerdict[]> {
  const { threads } = args
  if (threads.length === 0) return []
  const anthropic = createDeepSpaceAI(env, 'anthropic')

  const lines = [
    `Q1 (what the user wants to find): ${args.q1Find}`,
    `Q2 (what the user promotes and how): ${args.q2Promote}`,
    '',
    'Threads to judge:',
  ]
  threads.forEach((t, i) => {
    const sub = t.subsection ? ` (${t.subsection})` : ''
    lines.push(
      `[${i}] Source: ${t.source}${sub} | Title: ${t.title} | Excerpt: ${t.excerpt.slice(0, 1200)}`,
    )
  })
  lines.push(
    '',
    'Return ONLY a JSON array of verdicts, one per thread, as',
    '[{"i":<index>,"score":<0-10 integer>,"reason":"<one short line, no em dashes>",',
    '"type":"question"|"discussion"|"painpoint"}].',
  )

  const { text } = await generateText({
    model: anthropic(MODELS.judge),
    system: PROMPTS.judge,
    prompt: lines.join('\n'),
    maxOutputTokens: MODELS.judgeBatchMaxOutputTokens,
  })

  const arr = extractArray(text)
  const out: JudgeVerdict[] = threads.map(() => ({ ...EMPTY_VERDICT }))
  if (!arr) return out
  for (const v of arr) {
    if (!v || typeof v !== 'object') continue
    const obj = v as Record<string, unknown>
    const i = typeof obj.i === 'number' ? obj.i : parseInt(String(obj.i), 10)
    if (!Number.isInteger(i) || i < 0 || i >= threads.length) continue
    out[i] = {
      score: clampScore(obj.score),
      reason: typeof obj.reason === 'string' ? obj.reason.trim() : '',
      type: asType(obj.type),
    }
  }
  return out
}
