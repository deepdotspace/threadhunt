/**
 * Reply drafter. One Sonnet call writes a reply for a queued thread using Q2
 * and the topic's reply voice, plus optional few-shot examples of past approved
 * replies. Owner-billed through the DeepSpace proxy, with a hard output cap.
 */

import { generateText } from 'ai'
import { createDeepSpaceAI } from 'deepspace/worker'
import { PROMPTS, MODELS } from '../config'
import type { Env } from '../../worker'
import type { DraftModel } from '../types'
import type { RawResult } from './engine-types'

export interface DraftArgs {
  q2Promote: string
  replyVoice: string
  thread: RawResult
  examples: string[] // past approved replies, for few-shot; may be empty
  model?: DraftModel // defaults to 'sonnet', identical to today
  instruction?: string // ad-hoc tweak for this one reply; may be empty
}

function fewShotBlock(examples: string[]): string {
  const usable = examples.filter(Boolean)
  if (usable.length === 0) return ''
  return (
    '\n\nPast approved replies to match in tone and length:\n' +
    usable.map((e, i) => `Example ${i + 1}:\n${e}`).join('\n\n')
  )
}

export async function draftReply(env: Env, args: DraftArgs): Promise<string> {
  const anthropic = createDeepSpaceAI(env, 'anthropic')
  const { thread } = args

  const system = [
    PROMPTS.draft,
    args.replyVoice ? `Voice guidance from the user: ${args.replyVoice}` : '',
    args.instruction ? `Extra instruction for this specific reply: ${args.instruction}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const prompt = [
    `What the user promotes and how they want to mention it: ${args.q2Promote}`,
    '',
    `Source: ${thread.source}${thread.subsection ? ` (${thread.subsection})` : ''}`,
    `Title: ${thread.title}`,
    `Thread excerpt: ${thread.excerpt.slice(0, 2500)}`,
    fewShotBlock(args.examples),
    '',
    'Write the reply now.',
  ].join('\n')

  const modelId = MODELS.draftModels[args.model ?? 'sonnet']
  const { text } = await generateText({
    model: anthropic(modelId),
    system,
    prompt,
    maxOutputTokens: MODELS.draftMaxOutputTokens,
  })
  return text.trim()
}
