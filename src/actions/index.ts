/**
 * Server actions — privileged writes that bypass caller RBAC (clients are
 * read-only). Every handler resolves the caller from the verified JWT
 * (ctx.userId), loads the target record, and checks ownership before acting.
 */

import { buildCronContext } from 'deepspace/worker'
import type { ActionHandler, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import { DEFAULTS, FUNNEL } from '../config'
import type { CandidateData, DecisionData, DraftModel, TopicData } from '../types'
import { generateQueries } from '../server/queryGen'
import { draftReply } from '../server/draft'
import { computeNextDueAt } from '../server/schedule'
import { enqueueScan, enqueueScanNow } from '../server/runner'

type Envelope<T> = { recordId: string; data: T }

// Names used by the seedSampleData fixture; the idempotency check looks for these.
const SAMPLE_TOPIC_NAMES = new Set(['DeepSpace SDK', 'Deploykit CLI', 'Focusbar'])

type RecordsCtx = {
  query(collection: string, opts?: Record<string, unknown>): Promise<unknown[]>
  create(collection: string, data: Record<string, unknown>): Promise<unknown>
  update(collection: string, recordId: string, data: Record<string, unknown>): Promise<unknown>
}

/**
 * Adapt the action tools (ActionResult-wrapped) into an unwrapped, throwing
 * records context. Used by seedSampleData to write the fixture rows.
 */
function recordsFromTools(tools: ActionTools): RecordsCtx {
  return {
    async query(collection, opts) {
      const res = await tools.query(collection, opts)
      if (!res.success) throw new Error(res.error)
      return res.data.records
    },
    async create(collection, data) {
      const res = await tools.create(collection, data)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    async update(collection, recordId, data) {
      const res = await tools.update(collection, recordId, data)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
  }
}

// ---------------------------------------------------------------------------
// createTopic — generate queries if none given, then create the topic owned by
// the caller with its first due slot.
// ---------------------------------------------------------------------------

const createTopic: ActionHandler<Env> = async (ctx) => {
  const input = ctx.params as Partial<TopicData>
  if (!input.q1Find || !input.q2Promote) {
    return { success: false, error: 'Missing required setup answers (q1Find, q2Promote).' }
  }

  let queries = Array.isArray(input.queries) ? input.queries.filter(Boolean) : []
  if (queries.length === 0) {
    queries = (await generateQueries(ctx.env, input.q1Find)).slice(0, FUNNEL.queriesPerTopic)
  }

  const now = Date.now()
  const scansPerDay = (input.scansPerDay ?? DEFAULTS.scansPerDay) as 1 | 2 | 3
  const timeOfDay = input.timeOfDay ?? null

  const topic: TopicData = {
    name: input.name ?? '',
    q1Find: input.q1Find,
    q2Promote: input.q2Promote,
    queries,
    venues: input.venues?.length ? input.venues : DEFAULTS.venues,
    scansPerDay,
    timeOfDay,
    draftMode: input.draftMode ?? DEFAULTS.draftMode,
    draftModel: input.draftModel ?? 'sonnet',
    replyVoice: input.replyVoice ?? '',
    paused: false,
    lastScanAt: 0,
    nextDueAt: computeNextDueAt(now, scansPerDay, timeOfDay),
    ownerUserId: ctx.userId,
  }

  const created = await ctx.tools.create('topics', topic as unknown as Record<string, unknown>)
  if (!created.success) return created

  // Start the first scan now so the queue fills immediately instead of waiting
  // for the next scheduled slot. Non-fatal: the topic exists regardless and the
  // header Scan now button covers a failed enqueue.
  let jobId: string | undefined
  try {
    jobId = await enqueueScan(ctx.env, { recordId: created.data.recordId, data: topic })
  } catch (err) {
    console.error('[createTopic] first scan enqueue failed:', err)
  }
  return { success: true, data: { topicId: created.data.recordId, jobId, topic } }
}

// ---------------------------------------------------------------------------
// generateDraft — draft a reply for a queued candidate the caller owns, then
// write the draft back.
// ---------------------------------------------------------------------------

const generateDraft: ActionHandler<Env> = async (ctx) => {
  const { candidateId } = ctx.params as { candidateId?: string }
  if (!candidateId) return { success: false, error: 'Missing candidateId.' }

  const candRes = await ctx.tools.get('candidates', candidateId)
  if (!candRes.success) return candRes
  const cand = candRes.data.record.data as unknown as CandidateData
  if (cand.ownerUserId !== ctx.userId) {
    return { success: false, error: 'Forbidden: not your candidate.' }
  }

  const topicRes = await ctx.tools.get('topics', cand.topicId)
  if (!topicRes.success) return topicRes
  const topic = topicRes.data.record.data as unknown as TopicData

  // Chosen model wins, then the topic default, then sonnet.
  const model = (ctx.params as { model?: DraftModel }).model ?? topic.draftModel ?? 'sonnet'

  const draft = await draftReply(ctx.env, {
    q2Promote: topic.q2Promote,
    replyVoice: topic.replyVoice,
    thread: {
      url: cand.url,
      source: cand.source,
      subsection: cand.subsection,
      title: cand.title,
      author: cand.author,
      excerpt: cand.excerpt,
      highlights: cand.highlights,
      publishedAt: cand.publishedAt,
    },
    examples: [],
    model,
    instruction: (ctx.params as { instruction?: string }).instruction,
  })

  const updated = await ctx.tools.update('candidates', candidateId, { draftText: draft })
  if (!updated.success) return updated
  return { success: true, data: { draft } }
}

// ---------------------------------------------------------------------------
// reviewCandidate — record a posted/skipped outcome and log a decision. This is
// the human's manual copy-paste-then-mark step.
// ---------------------------------------------------------------------------

const reviewCandidate: ActionHandler<Env> = async (ctx) => {
  const { candidateId, action, finalText } = ctx.params as {
    candidateId?: string
    action?: 'posted' | 'skipped'
    finalText?: string
  }
  if (!candidateId || (action !== 'posted' && action !== 'skipped')) {
    return { success: false, error: 'Missing or invalid params (candidateId, action).' }
  }

  const candRes = await ctx.tools.get('candidates', candidateId)
  if (!candRes.success) return candRes
  const cand = candRes.data.record.data as unknown as CandidateData
  if (cand.ownerUserId !== ctx.userId) {
    return { success: false, error: 'Forbidden: not your candidate.' }
  }

  const updated = await ctx.tools.update('candidates', candidateId, { status: action })
  if (!updated.success) return updated

  const text = finalText?.trim() ?? ''
  // 'edited' when the user changed the draft before posting; else 'posted'.
  const decisionAction: DecisionData['action'] =
    action === 'skipped' ? 'skipped' : text && text !== cand.draftText.trim() ? 'edited' : 'posted'

  const decision: DecisionData = {
    candidateId,
    topicId: cand.topicId,
    action: decisionAction,
    finalText: action === 'posted' ? text || cand.draftText : '',
    actorUserId: ctx.userId,
  }
  const logged = await ctx.tools.create('decisions', decision as unknown as Record<string, unknown>)
  if (!logged.success) return logged
  return { success: true, data: { status: action } }
}

// ---------------------------------------------------------------------------
// runScanNow — manual scan trigger for a topic the caller owns. Enqueues the
// scan background job and returns its jobId.
// ---------------------------------------------------------------------------

const runScanNow: ActionHandler<Env> = async (ctx) => {
  const { topicId } = ctx.params as { topicId?: string }
  if (!topicId) return { success: false, error: 'Missing topicId.' }
  try {
    const cron = buildCronContext(ctx.env, ctx.env.OWNER_USER_ID, `app:${ctx.env.APP_NAME}`)
    const jobId = await enqueueScanNow(ctx.env, cron, topicId, ctx.userId)
    return { success: true, data: { jobId } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Scan failed.' }
  }
}

// ---------------------------------------------------------------------------
// Owner-checked topic management for Settings.
// ---------------------------------------------------------------------------

/** Load a topic and confirm the caller owns it before mutating. */
async function loadOwnedTopic(
  ctx: Parameters<ActionHandler<Env>>[0],
  topicId: string,
): Promise<{ ok: true; topic: Envelope<TopicData> } | { ok: false; error: string }> {
  const res = await ctx.tools.get('topics', topicId)
  if (!res.success) return { ok: false, error: res.error }
  const topic = res.data.record as unknown as Envelope<TopicData>
  if (topic.data.ownerUserId !== ctx.userId) return { ok: false, error: 'Forbidden: not your topic.' }
  return { ok: true, topic }
}

const pauseTopic: ActionHandler<Env> = async (ctx) => {
  const { topicId, paused } = ctx.params as { topicId?: string; paused?: boolean }
  if (!topicId || typeof paused !== 'boolean') {
    return { success: false, error: 'Missing params (topicId, paused).' }
  }
  const owned = await loadOwnedTopic(ctx, topicId)
  if (!owned.ok) return { success: false, error: owned.error }
  return ctx.tools.update('topics', topicId, { paused })
}

const updateTopic: ActionHandler<Env> = async (ctx) => {
  const { topicId, patch } = ctx.params as { topicId?: string; patch?: Partial<TopicData> }
  if (!topicId || !patch || typeof patch !== 'object') {
    return { success: false, error: 'Missing params (topicId, patch).' }
  }
  const owned = await loadOwnedTopic(ctx, topicId)
  if (!owned.ok) return { success: false, error: owned.error }
  // Never let a patch reassign ownership.
  const { ownerUserId: _ignore, ...safe } = patch
  // When the "what to find" answer changes, regenerate the search queries so
  // the scan does not keep using stale ones. Skip if regeneration yields none.
  if (typeof patch.q1Find === 'string' && patch.q1Find.trim() && patch.q1Find !== owned.topic.data.q1Find) {
    const queries = (await generateQueries(ctx.env, patch.q1Find)).slice(0, FUNNEL.queriesPerTopic)
    if (queries.length) safe.queries = queries
  }
  return ctx.tools.update('topics', topicId, safe)
}

const deleteTopic: ActionHandler<Env> = async (ctx) => {
  const { topicId } = ctx.params as { topicId?: string }
  if (!topicId) return { success: false, error: 'Missing topicId.' }
  const owned = await loadOwnedTopic(ctx, topicId)
  if (!owned.ok) return { success: false, error: owned.error }
  return ctx.tools.remove('topics', topicId)
}

// ---------------------------------------------------------------------------
// seedSampleData — verification-only fixture. Owner or local dev may seed a
// realistic, caller-owned dataset (topics, candidates across every status, a
// few logged decisions) so design parity can be checked against real screens.
// Idempotent-ish: refuses if the caller already owns seeded sample topics.
// ---------------------------------------------------------------------------

const seedSampleData: ActionHandler<Env> = async (ctx) => {
  // In dev the platform service binding is absent and only the URL fallback is
  // set; production deploys carry the binding. Allow owner anywhere, anyone in dev.
  const isOwner = !!ctx.env.OWNER_USER_ID && ctx.userId === ctx.env.OWNER_USER_ID
  const isDev = !ctx.env.PLATFORM_WORKER && !!ctx.env.PLATFORM_WORKER_URL
  if (!isOwner && !isDev) {
    return { success: false, error: 'Forbidden: seedSampleData is owner or dev only.' }
  }

  const records = recordsFromTools(ctx.tools)
  const owned = (await records.query('topics', { where: { ownerUserId: ctx.userId } })) as Envelope<
    TopicData
  >[]
  if (owned.some((t) => SAMPLE_TOPIC_NAMES.has(t.data.name))) {
    return { success: false, error: 'Sample data already present for this account.' }
  }

  const now = Date.now()
  const HOUR = 60 * 60 * 1000
  const DAY = 24 * HOUR

  // Three topics: varied venues, cadence, and draft mode.
  const topicDefs: Array<Partial<TopicData> & { name: string }> = [
    {
      name: 'DeepSpace SDK',
      q1Find: 'developers asking how to add realtime sync, presence, or multiplayer state to a web app',
      q2Promote:
        'DeepSpace, an SDK that gives you Durable Object rooms, WebSocket sync, presence, and payments with one deploy. Mention it only when it answers the question.',
      queries: [
        'cloudflare workers realtime collaboration',
        'durable objects multiplayer state',
        'partykit alternative',
        'liveblocks alternative self host',
      ],
      venues: ['reddit', 'hackernews'],
      scansPerDay: 2,
      timeOfDay: '09:00',
      draftMode: 'auto',
      replyVoice:
        'Direct and technical, first person. Reference the specific problem. No marketing language, one short paragraph.',
    },
    {
      name: 'Deploykit CLI',
      q1Find: 'teams frustrated with managing wrangler config and tearing down Cloudflare stacks',
      q2Promote:
        'Deploykit, a CLI that provisions Workers, R2, and KV from one manifest with drift detection and one-command teardown. Bring it up only when it fits.',
      queries: ['wrangler shared config across apps', 'cloudflare stack teardown script', 'workers infra as code'],
      venues: ['reddit', 'indiehackers'],
      scansPerDay: 1,
      timeOfDay: null,
      draftMode: 'manual',
      replyVoice: 'Plain and practical. Name the flag or file when it helps. One paragraph, no hype.',
    },
    {
      name: 'Focusbar',
      q1Find: 'people venting about losing focus, context switching, and noisy notifications while they work',
      q2Promote:
        'Focusbar, a small menu-bar timer that mutes notifications and tracks deep-work blocks. Only mention it where someone is actually looking for a tool.',
      queries: ['how to stop context switching at work', 'block notifications during focus time', 'pomodoro menu bar app'],
      venues: ['reddit', 'devto', 'x'],
      scansPerDay: 3,
      timeOfDay: '08:30',
      draftMode: 'manual',
      replyVoice: 'Warm and concrete. Share what actually worked. No selling, no sign-off.',
    },
  ]

  const topicIds: string[] = []
  for (const def of topicDefs) {
    const scansPerDay = (def.scansPerDay ?? 1) as 1 | 2 | 3
    const topic: TopicData = {
      name: def.name,
      q1Find: def.q1Find ?? '',
      q2Promote: def.q2Promote ?? '',
      queries: def.queries ?? [],
      venues: def.venues ?? ['reddit'],
      scansPerDay,
      timeOfDay: def.timeOfDay ?? null,
      draftMode: def.draftMode ?? 'manual',
      replyVoice: def.replyVoice ?? '',
      paused: false,
      lastScanAt: now - 4 * HOUR,
      nextDueAt: computeNextDueAt(now, scansPerDay, def.timeOfDay ?? null),
      ownerUserId: ctx.userId,
    }
    const created = await records.create('topics', topic as unknown as Record<string, unknown>)
    topicIds.push((created as Envelope<unknown>).recordId)
  }
  const [deepspaceId, deploykitId, focusbarId] = topicIds

  // Candidates across every status, source, and type. Some queued with a draft,
  // some queued without (draftMode manual), posted and skipped for history.
  const candDefs: Array<Omit<CandidateData, 'ownerUserId'>> = [
    {
      topicId: deepspaceId,
      url: 'https://www.reddit.com/r/webdev/comments/sig01/realtime_cursors_without_running_my_own_server/',
      source: 'reddit',
      subsection: 'r/webdev',
      title: 'Realtime cursors and presence without running my own socket server?',
      author: 'mira_builds',
      excerpt:
        'I want live cursors and a presence list on a small collab tool but I do not want to run and scale a websocket server myself. What are people using in 2026?',
      highlights: ['live cursors and a presence list', 'do not want to run and scale a websocket server'],
      publishedAt: now - 5 * HOUR,
      score: 9,
      reason: 'Direct ask for presence and cursors without managed sockets, exactly the fit.',
      type: 'question',
      draftText:
        'Presence and cursors are the part that looks easy and then eats a month once you handle reconnects and fan-out.\n\n' +
        'If you do not want to run sockets yourself, a Durable Object per room handles the state and the websocket fan-out for you, and presence is just awareness messages on that room. DeepSpace wraps exactly this (room, presence, cursors) and deploys to Workers in one command, so you skip the infra and keep your app code.',
      status: 'queued',
    },
    {
      topicId: deepspaceId,
      url: 'https://news.ycombinator.com/item?id=sig02',
      source: 'hackernews',
      title: 'Ask HN: PartyKit vs Liveblocks vs rolling your own for a collab editor?',
      author: 'tcoder',
      subsection: 'Ask HN',
      excerpt:
        'Building a collaborative editor side project. Torn between PartyKit, Liveblocks, and just writing the sync layer on Durable Objects. Cost and lock-in are my worries.',
      highlights: ['PartyKit, Liveblocks, and just writing the sync layer', 'Cost and lock-in are my worries'],
      publishedAt: now - 9 * HOUR,
      score: 8,
      reason: 'Comparison thread where a self-hosted DO option is a genuine answer.',
      type: 'discussion',
      draftText:
        'I went through this same comparison last year. The hidden cost with the managed options is per-connection pricing once your editor gets real usage, and the lock-in is the storage model.\n\n' +
        'Rolling sync on Durable Objects keeps it on your own Cloudflare account with no per-seat pricing. If you want that without writing the Yjs plumbing, DeepSpace gives you the DO room plus a Yjs document binding, so you own the stack but skip the sync code.',
      status: 'queued',
    },
    {
      topicId: deepspaceId,
      url: 'https://www.reddit.com/r/CloudFlare/comments/sig03/durable_objects_for_chat_rooms_worth_it/',
      source: 'reddit',
      subsection: 'r/CloudFlare',
      title: 'Are Durable Objects worth it for chat rooms or am I overthinking this?',
      author: 'devon_q',
      excerpt:
        'Small app, maybe a few hundred concurrent users in rooms. Is a Durable Object per room the right call or is that overkill?',
      highlights: ['a Durable Object per room', 'few hundred concurrent users'],
      publishedAt: now - 26 * HOUR,
      score: 7,
      reason: 'On topic but the asker may not need a product, so a light mention only.',
      type: 'question',
      draftText: '',
      status: 'queued',
    },
    {
      topicId: deepspaceId,
      url: 'https://x.com/buildlog/status/sig04',
      source: 'x',
      title: 'Shipped multiplayer in a weekend, the websocket reconnect logic was the whole weekend',
      author: '@buildlog',
      subsection: '',
      excerpt:
        'Multiplayer demo took an afternoon. Making reconnects, presence cleanup, and message ordering reliable took the rest of the weekend. Nobody warns you about this part.',
      highlights: ['reconnects, presence cleanup, and message ordering', 'Nobody warns you about this part'],
      publishedAt: now - 2 * DAY,
      score: 6,
      reason: 'Relatable pain but a vent, not a question, so engagement value is moderate.',
      type: 'painpoint',
      draftText: '',
      status: 'queued',
    },
    {
      topicId: deepspaceId,
      url: 'https://www.reddit.com/r/SideProject/comments/sig05/added_live_collab_to_my_app/',
      source: 'reddit',
      subsection: 'r/SideProject',
      title: 'Added live collaboration to my app and retention jumped',
      author: 'sara_ships',
      excerpt:
        'Put shared editing and presence into my note app and weekly retention went up noticeably. Happy to share the stack if anyone wants it.',
      highlights: ['shared editing and presence', 'weekly retention went up'],
      publishedAt: now - 3 * DAY,
      score: 8,
      reason: 'Author already won, posted as a friendly stack-sharing reply.',
      type: 'discussion',
      draftText:
        'Congrats, presence is one of those features people feel immediately. For anyone reading who wants the same without standing up socket infra, a Durable Object per document handles the sync and presence on Cloudflare, and DeepSpace packages that so it is a deploy rather than a build.',
      status: 'posted',
    },
    {
      topicId: deepspaceId,
      url: 'https://news.ycombinator.com/item?id=sig06',
      source: 'hackernews',
      subsection: '',
      title: 'Show HN: My realtime backend that is basically Firebase on Workers',
      author: 'founderx',
      excerpt:
        'I built a realtime backend on Cloudflare Workers as a Firebase alternative. Looking for feedback on the sync model.',
      highlights: ['realtime backend on Cloudflare Workers', 'feedback on the sync model'],
      publishedAt: now - 4 * DAY,
      score: 4,
      reason: 'Author is shipping a competing tool, a product mention would not land.',
      type: 'discussion',
      draftText: '',
      status: 'skipped',
    },
    {
      topicId: deploykitId,
      url: 'https://www.reddit.com/r/CloudFlare/comments/sig07/wrangler_toml_drift_across_apps/',
      source: 'reddit',
      subsection: 'r/CloudFlare',
      title: 'wrangler.toml binding IDs keep drifting across 8 Workers apps',
      author: 'infra_eng_42',
      excerpt:
        'We copy binding IDs across eight toml files and they drift after every refactor. Is there a clean way to share config across Workers apps?',
      highlights: ['copy binding IDs across eight toml files', 'a clean way to share config'],
      publishedAt: now - 6 * HOUR,
      score: 9,
      reason: 'Exact pain Deploykit solves with a single manifest and drift detection.',
      type: 'painpoint',
      draftText:
        'We hit the same thing across six apps and the drift always surfaced at the worst time. What fixed it was moving every binding into one manifest and generating the per-app toml sections at deploy, so a mismatch fails the deploy instead of running on a stale ID.\n\n' +
        'Deploykit does exactly this for Workers, R2, and KV if you want it off the shelf, but the manifest-then-generate pattern is worth adopting either way.',
      status: 'queued',
    },
    {
      topicId: deploykitId,
      url: 'https://www.indiehackers.com/post/sig08/clean-teardown-of-a-cloudflare-stack',
      source: 'indiehackers',
      subsection: 'Indie Hackers',
      title: 'How do I cleanly tear down a Cloudflare stack (Workers, KV, R2, DNS)?',
      author: 'platform_lead',
      excerpt:
        'When a project ends I have to remove Workers, KV, R2, and DNS across several dashboard sections. Is there a reliable way to script the teardown?',
      highlights: ['remove Workers, KV, R2, and DNS', 'reliable way to script the teardown'],
      publishedAt: now - 30 * HOUR,
      score: 8,
      reason: 'Clear question with a script-or-tool answer Deploykit fits.',
      type: 'question',
      draftText:
        'The manual multi-section teardown is where orphaned namespaces come from, nobody wants to click through every tab. If you keep a manifest of what was provisioned, a teardown can call the API in dependency order: Worker first to release the route, then bucket, then namespace, then DNS. Deploykit has a teardown command that works off the same manifest used to provision, so you delete exactly what you created.',
      status: 'queued',
    },
    {
      topicId: deploykitId,
      url: 'https://www.reddit.com/r/webdev/comments/sig09/r2_bucket_names_drift_between_envs/',
      source: 'reddit',
      subsection: 'r/webdev',
      title: 'R2 bucket names drift between staging and prod and uploads silently vanish',
      author: 'fullstack_mira',
      excerpt:
        'Staging R2 got a different bucket name after a manual create and an upload silently disappeared. How do people keep env config in sync?',
      highlights: ['different bucket name after a manual create', 'an upload silently disappeared'],
      publishedAt: now - 2 * DAY,
      score: 7,
      reason: 'Real bug with a config-as-source-of-truth answer, product fits as an aside.',
      type: 'painpoint',
      draftText:
        'Silent write failures on a renamed bucket are brutal because R2 does not error, it just acts empty. The root cause is usually a bucket created outside the pipeline, so nothing records the intended name. Move bucket creation into a version-controlled manifest and both envs read one source, then a mismatch becomes a deploy-time error. Drift detection catches it before the deploy ships.',
      status: 'posted',
    },
    {
      topicId: focusbarId,
      url: 'https://www.reddit.com/r/productivity/comments/sig10/cant_stop_context_switching/',
      source: 'reddit',
      subsection: 'r/productivity',
      title: 'I cannot stop context switching and it is wrecking my deep work',
      author: 'quiet_dev',
      excerpt:
        'Every notification pulls me out and it takes ten minutes to get back. I have tried willpower and it does not work. What actually helps you protect focus blocks?',
      highlights: ['Every notification pulls me out', 'protect focus blocks'],
      publishedAt: now - 7 * HOUR,
      score: 8,
      reason: 'Genuine ask for a focus tool, the product is a natural fit.',
      type: 'painpoint',
      draftText:
        'Willpower never worked for me either, the fix was making the distraction harder than the work. I batch notifications to two windows a day and run a hard 50-minute block where everything is muted at the OS level, not just the app. Focusbar is the small menu-bar timer I use for the muting and the block tracking, but even a plain Do Not Disturb schedule will get you most of the way.',
      status: 'queued',
    },
    {
      topicId: focusbarId,
      url: 'https://dev.to/sig11/deep-work-with-a-noisy-team-chat',
      source: 'devto',
      subsection: 'Dev.to',
      title: 'What is the best way to do deep work with a noisy team chat?',
      author: 'A. Rao',
      excerpt:
        'Our team chat never stops and I cannot get an hour of focus. How do people carve out deep work without seeming unresponsive?',
      highlights: ['team chat never stops', 'without seeming unresponsive'],
      publishedAt: now - 28 * HOUR,
      score: 6,
      reason: 'On topic but more about team norms than a tool, so a light touch.',
      type: 'question',
      draftText: '',
      status: 'queued',
    },
    {
      topicId: focusbarId,
      url: 'https://x.com/deepworkdiary/status/sig12',
      source: 'x',
      subsection: '',
      title: 'The honest answer to focus is fewer apps open, not another app',
      author: '@deepworkdiary',
      excerpt:
        'Hot take, most focus apps are just guilt with a monthly fee. The thing that works is closing tabs and turning off notifications.',
      highlights: ['most focus apps are just guilt with a monthly fee', 'closing tabs and turning off notifications'],
      publishedAt: now - 3 * DAY,
      score: 3,
      reason: 'Hostile to tools in this category, a product mention would be unwelcome.',
      type: 'discussion',
      draftText: '',
      status: 'skipped',
    },
  ]

  const candidateIds: string[] = []
  for (const def of candDefs) {
    const row: CandidateData = { ...def, ownerUserId: ctx.userId }
    const created = await records.create('candidates', row as unknown as Record<string, unknown>)
    candidateIds.push((created as Envelope<unknown>).recordId)
  }

  // A few logged decisions so History has content, paired to the posted/skipped
  // candidates above (indexes: posted 4, skipped 5, posted 8, skipped 11).
  const decisionDefs: Array<{ candIndex: number; action: DecisionData['action']; finalText: string }> = [
    {
      candIndex: 4,
      action: 'edited',
      finalText:
        'Congrats, presence is one of those features people feel immediately. For anyone who wants the same without standing up socket infra, a Durable Object per document handles sync and presence on Cloudflare, and DeepSpace packages that into a single deploy.',
    },
    { candIndex: 5, action: 'skipped', finalText: '' },
    {
      candIndex: 8,
      action: 'posted',
      finalText:
        'Silent write failures on a renamed bucket are brutal because R2 does not error, it just acts empty. Move bucket creation into a version-controlled manifest so both envs read one source, then a mismatch becomes a deploy-time error. Drift detection catches it before the deploy ships.',
    },
    { candIndex: 11, action: 'skipped', finalText: '' },
  ]

  const decisionIds: string[] = []
  for (const d of decisionDefs) {
    const cand = candDefs[d.candIndex]
    const decision: DecisionData = {
      candidateId: candidateIds[d.candIndex],
      topicId: cand.topicId,
      action: d.action,
      finalText: d.finalText,
      actorUserId: ctx.userId,
    }
    const created = await records.create('decisions', decision as unknown as Record<string, unknown>)
    decisionIds.push((created as Envelope<unknown>).recordId)
  }

  return {
    success: true,
    data: {
      topics: topicIds.length,
      candidates: candidateIds.length,
      decisions: decisionIds.length,
      firstTopicId: topicIds[0] ?? null,
    },
  }
}

export const actions: Record<string, ActionHandler<Env>> = {
  createTopic,
  generateDraft,
  reviewCandidate,
  runScanNow,
  pauseTopic,
  updateTopic,
  deleteTopic,
  seedSampleData,
}
