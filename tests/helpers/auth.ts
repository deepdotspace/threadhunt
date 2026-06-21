import type { Page } from '@playwright/test'

/**
 * Test account for the signed-in specs. Reply Radar disables public sign-up, so
 * those specs need a pre-provisioned account. Create one once with
 * `npx deepspace test-accounts create` and expose it via env:
 *   APP_TEST_EMAIL / APP_TEST_PASSWORD
 * Without it, the signed-in specs skip (see HAS_TEST_ACCOUNT below). No real
 * credential is committed.
 */
export const VERIFY_ACCOUNT = {
  email: process.env.APP_TEST_EMAIL ?? '',
  password: process.env.APP_TEST_PASSWORD ?? '',
}

/** True when a test account is configured; signed-in specs skip otherwise. */
export const HAS_TEST_ACCOUNT = Boolean(VERIFY_ACCOUNT.email && VERIFY_ACCOUNT.password)

/**
 * Sign in through the SDK email path. The auth endpoint requires a real Origin
 * header, so the POST has to run inside the page (a raw fetch from Node is
 * rejected with MISSING_OR_NULL_ORIGIN). This sets the session cookie in the
 * page's context. Do NOT click /continue/i buttons in the AuthOverlay — those
 * hit Continue-with-GitHub.
 */
export async function signInWithEmail(
  page: Page,
  account: { email: string; password: string } = VERIFY_ACCOUNT,
): Promise<void> {
  await page.goto('/')
  const status = await page.evaluate(async (acc) => {
    const res = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(acc),
    })
    return res.status
  }, account)
  if (status !== 200) {
    throw new Error(`email sign-in failed for ${account.email} (status ${status}); is the password current?`)
  }
}

/**
 * Call a server action the way the app client does: fetch a bearer token, then
 * POST /api/actions/<name>. Returns the parsed envelope { success, data?, error? }.
 * Must be called after signInWithEmail (needs the session cookie).
 */
export async function callAction<T = unknown>(
  page: Page,
  name: string,
  body: Record<string, unknown> = {},
): Promise<{ success: boolean; data?: T; error?: string }> {
  return page.evaluate(
    async ({ name, body }) => {
      const tokRes = await fetch('/api/auth/token', { method: 'POST', credentials: 'include' })
      const { token } = await tokRes.json()
      const res = await fetch('/api/actions/' + name, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(body),
      })
      return res.json()
    },
    { name, body },
  )
}

/**
 * Seed the sample dataset (topics/candidates/decisions) for the signed-in user.
 * The action refuses with success:false if the account already has sample data,
 * which is fine: either way the account ends up seeded. Returns the action
 * envelope so callers can read data.firstTopicId on a fresh seed.
 */
export async function seedSampleData(page: Page) {
  return callAction<{ firstTopicId: string | null }>(page, 'seedSampleData')
}
