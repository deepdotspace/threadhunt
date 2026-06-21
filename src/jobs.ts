/**
 * Background-job handler. Invoked by AppJobRoom (worker.ts) for every job
 * picked up from the queue. Dispatch on `job.type`; return the result value or
 * throw to fail. Long jobs checkpoint with `ctx.continue(state)` and resume on
 * the next alarm with `job.resumeFrom = state`.
 *
 * The 'scan' job runs the discovery engine as the app owner. It chunks search
 * then judge via `scanTick`, carrying a JSON `ScanState` across ticks so it
 * never trips the Worker subrequest ceiling and can judge a full per-scan
 * budget. Two contexts are in play: `jobCtx` (the JobContext, 2nd arg) gives
 * progress/continue/signal; `ctx` (a fresh owner CronContext) gives records +
 * owner-billed integrations.
 */

import type { Job, JobContext } from 'deepspace/worker'
import { buildCronContext } from 'deepspace/worker'
import type { Env } from '../worker'
import { FUNNEL } from './config'
import type { TopicData } from './types'
import { scanTick, emptyStats, type ScanState } from './server/engine'

type Envelope<T> = { recordId: string; data: T; createdAt?: string | number }

type ScanPayload = {
  topicId: string
  recencyDays: number
}

export async function runJob(job: Job, jobCtx: JobContext, env: Env): Promise<unknown | void> {
  if (job.type === 'scan') {
    const { topicId, recencyDays } = job.payload as ScanPayload
    // Owner context: records + owner-billed integrations, same as runner.ts.
    const ctx = buildCronContext(env, env.OWNER_USER_ID, `app:${env.APP_NAME}`)

    const topics = (await ctx.records.query('topics', {})) as Envelope<TopicData>[]
    const topic = topics.find((t) => t.recordId === topicId)
    if (!topic) throw new Error('scan: topic not found')

    let state = job.resumeFrom as ScanState | undefined
    if (!state) {
      state = { stage: 'search', cursor: 0, queue: [], judged: 0, stats: emptyStats() }
    }

    if (jobCtx.signal.aborted) return state.stats

    const { state: next, done } = await scanTick(env, ctx, { topic, recencyDays, state })
    jobCtx.progress(
      Math.min(1, next.judged / FUNNEL.judgeBudgetPerScan),
      `judged ${next.judged}, queued ${next.stats.queued}`,
    )

    if (!done) {
      jobCtx.continue(next, { afterMs: 0 })
      return
    }
    // Done: stamp the completion time so the schedule advances.
    await ctx.records.update('topics', topic.recordId, { lastScanAt: Date.now() })
    return next.stats
  }

  throw new Error('Unknown job type: ' + job.type)
}
