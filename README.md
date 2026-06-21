# Reply Radar

Reply Radar finds online discussions worth replying to, drafts a reply with AI, and lets you post it by hand. It watches the topics you care about across Reddit, Hacker News, X, Indie Hackers, and Dev.to, scores how good each match is, and gives you a fast, keyboard-first queue to triage.

This is the open personal edition: a single-tenant tool you deploy on your own [DeepSpace](https://docs.deep.space) account in about three commands. You are the only user and the owner, so there is no billing, no credits, and no paywall. Scans and drafts just run, and any AI usage is billed to your own DeepSpace account.

> The product name in this code defaults to "Reply Radar". The GitHub repository is named `threadhunt`. Rename the product to whatever you like before you deploy (see below).

## Before you deploy: set your app name

The name lives in two places. Change both, then deploy.

1. `src/constants.ts`
   - `APP_NAME` is the lowercase slug (the deployed subdomain and the app id). This must match `wrangler.toml`.
   - `APP_DISPLAY_NAME` is the name shown in the UI (sidebar, landing page, browser title).
2. `wrangler.toml`
   - `name` (the worker and `<name>.app.space` subdomain)
   - `[vars] APP_NAME` (must equal `APP_NAME` in `src/constants.ts`)

That is the whole rename. The browser tab title also appears in `index.html` if you want it to match.

## Prerequisite

A DeepSpace account. Auth, the database, real-time sync, background jobs, file storage, AI, and hosting all come from the SDK, so there is nothing else to set up. No API keys, no separate services.

## Quick start

Deploy your own copy in three commands:

```sh
npm install
npx deepspace login     # one-time, opens a browser tab
npx deepspace deploy    # deploys to <name>.app.space
```

Run it locally instead:

```sh
npm install
npx deepspace login
npx deepspace dev       # local dev server
```

## Commands

| Command | What it does |
|---|---|
| `npx deepspace dev` | Local dev server (Vite + Worker, with HMR) |
| `npx deepspace deploy` | Deploy to `<name>.app.space` |
| `npx deepspace test` | Smoke + API + E2E specs |
| `npm run type-check` | `tsc --noEmit` |

## Features

- **Topics:** describe what you want to find; Reply Radar watches your chosen venues for matching threads.
- **Five venues:** Reddit, Hacker News, X, Indie Hackers, and Dev.to. Pick which ones each topic watches.
- **Background scan engine:** each scan runs as a DeepSpace background job with per-venue search, recency windows, and batched AI judging against your topic, so candidates stream into your queue as they are found.
- **Match scoring:** a compact three-bar indicator shows how strong each match is.
- **Keyboard-first triage:** a dense queue with a detail pane. Review a candidate, read the AI-drafted reply, open the source thread, and act without leaving the keyboard.
- **Model picker:** draft each reply with Haiku, Sonnet, or Opus, with a per-reply instruction to steer the voice.
- **Post by hand:** Reply Radar drafts; you always post the reply yourself. Nothing is auto-posted.
- **Scheduling:** topics rescan on a cadence you set, or scan now on demand.
- **History:** every action, grouped by day or topic, with CSV and JSON export.
- **Dark, focused UI** built for triage sessions.

## How it works

A DeepSpace app on Cloudflare Workers. A scan is a background job (a `JobRoom` Durable Object) that searches each venue, filters by recency, and judges candidates with AI on a real budget; matches are written as records that sync to the queue in real time. You are the single owner, so scans and drafts run with no gating and the AI is billed to your own DeepSpace account. All engine tunables (the funnel, prompts, and model ids) live in one file, `src/config.ts`.

## Tests

```sh
npx deepspace test       # smoke + API + E2E
npm run type-check       # tsc --noEmit
```

The signed-out smoke and API specs run on a fresh clone. The signed-in specs need a pre-provisioned account (public sign-up is disabled), so they skip unless you supply one:

```sh
npx deepspace test-accounts create --email you@example.test --password 'Pass123!' --name 'Test'
APP_TEST_EMAIL=you@example.test APP_TEST_PASSWORD='Pass123!' npx deepspace test
```

---

MIT licensed. Built with the [DeepSpace SDK](https://docs.deep.space).
