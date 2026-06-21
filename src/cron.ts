/**
 * Cron task definitions — registered into the AppCronRoom DO at construction
 * time (worker.ts). The DO alarm fires `runTask(name, env)` on the schedule
 * declared here; the DO records executions and pushes status to admin clients
 * via the `/ws/cron/:roomId` WebSocket.
 *
 * One task: `tick` — every hour, scan topics whose nextDueAt has passed. The
 * per-topic cadence lives on each topics row, not in the task list.
 */

import type { CronTask } from 'deepspace/worker'
import type { Env } from '../worker'
import { runDueScans } from './server/runner'

export const tasks: CronTask[] = [{ name: 'tick', intervalMinutes: 60 }]

export async function runTask(name: string, env: Env): Promise<void> {
  if (name === 'tick') {
    await runDueScans(env)
  }
}
