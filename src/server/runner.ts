/**
 * Scan loop runner. Bridges the cron tick and the manual trigger to the scan
 * background job. Both paths enqueue a 'scan' job and return; the job stamps
 * lastScanAt itself. The runner only enqueues and (for the cron path) advances
 * each topic's nextDueAt to the next slot.
 */

import { buildCronContext, enqueueJob } from 'deepspace/worker'
import type { CronContext } from 'deepspace/worker'
import { FUNNEL } from '../config'
import type { TopicData } from '../types'
import type { Env } from '../../worker'
import { computeNextDueAt } from './schedule'

type Envelope<T> = { recordId: string; data: T }

/** Owner cron context, bound to the app's shared RecordRoom. */
function ownerContext(env: Env): CronContext {
  return buildCronContext(env, env.OWNER_USER_ID, `app:${env.APP_NAME}`)
}

/** Schedule the next run for a topic from its cadence and preferred time. */
async function advanceSchedule(
  ctx: CronContext,
  topic: Envelope<TopicData>,
  now: number,
  lastScanAt: number | null,
): Promise<void> {
  const nextDueAt = computeNextDueAt(now, topic.data.scansPerDay, topic.data.timeOfDay)
  const patch: Record<string, unknown> = { nextDueAt }
  if (lastScanAt !== null) patch.lastScanAt = lastScanAt
  await ctx.records.update('topics', topic.recordId, patch)
}

/**
 * Enqueue a scan job for one topic. The window is wide on the first run and
 * tight afterwards. The job stamps lastScanAt.
 */
export async function enqueueScan(env: Env, topic: Envelope<TopicData>): Promise<string> {
  const recencyDays =
    topic.data.lastScanAt > 0 ? FUNNEL.recencyDaysOngoing : FUNNEL.recencyDaysFirstRun
  return enqueueJob(
    env.JOB_ROOMS,
    `app:${env.APP_NAME}`,
    'scan',
    { topicId: topic.recordId, recencyDays },
    { maxAttempts: 1, enqueuedBy: topic.data.ownerUserId },
  )
}

/**
 * Cron tick. Enqueue a scan job for every non-paused topic whose nextDueAt has
 * passed, capped per tick, then advance the schedule (lastScanAt unset; the job
 * stamps it). One topic's failure never kills the rest of the tick.
 */
export async function runDueScans(env: Env): Promise<void> {
  const ctx = ownerContext(env)
  const now = Date.now()

  const topics = (await ctx.records.query('topics', {
    where: { paused: false },
  })) as Envelope<TopicData>[]
  const due = topics
    .filter((t) => (t.data.nextDueAt ?? 0) <= now)
    .slice(0, FUNNEL.maxTopicsPerTick)

  for (const topic of due) {
    try {
      await enqueueScan(env, topic)
      // Move only nextDueAt; the job stamps lastScanAt when it runs.
      await advanceSchedule(ctx, topic, now, null)
    } catch (err) {
      console.error(`[runner] tick error for topic ${topic.recordId}:`, err)
    }
  }
}

/**
 * Manual scan trigger. Scopes to the caller's topics, finds the requested one,
 * and enqueues a scan job. Returns the jobId.
 */
export async function enqueueScanNow(
  env: Env,
  ctx: CronContext,
  topicId: string,
  userId: string,
): Promise<string> {
  // Scope the query to the caller's topics, then match the id. A topic the
  // caller does not own is simply absent, which reads as a not-found error.
  const rows = (await ctx.records.query('topics', {
    where: { ownerUserId: userId },
  })) as Envelope<TopicData>[]
  const topic = rows.find((t) => t.recordId === topicId)
  if (!topic) throw new Error('Topic not found or not yours.')

  return enqueueScan(env, topic)
}
