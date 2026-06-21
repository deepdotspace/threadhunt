/**
 * Query generation. Turns Q1 (what to find) into a set of plain search queries
 * via Haiku, owner-billed through the DeepSpace proxy. The model is told to
 * return a JSON array; we parse defensively and cap to the funnel width.
 */

import { generateText } from 'ai'
import { createDeepSpaceAI } from 'deepspace/worker'
import { PROMPTS, MODELS, FUNNEL } from '../config'
import type { Env } from '../../worker'

/** Pull a JSON array of strings out of model text, tolerant of stray prose. */
function parseQueryArray(text: string): string[] {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) return []
  try {
    const parsed = JSON.parse(text.slice(start, end + 1))
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((q): q is string => typeof q === 'string')
      .map((q) => q.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

export async function generateQueries(env: Env, q1Find: string): Promise<string[]> {
  const anthropic = createDeepSpaceAI(env, 'anthropic')
  const { text } = await generateText({
    model: anthropic(MODELS.judge),
    system: PROMPTS.queryGen,
    prompt: `What the user wants to find:\n${q1Find}`,
    maxOutputTokens: MODELS.queryGenMaxOutputTokens,
  })
  return parseQueryArray(text).slice(0, FUNNEL.queriesPerTopic)
}
