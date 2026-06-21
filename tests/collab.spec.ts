/**
 * Multi-user isolation spec.
 *
 * Reply Radar is a single-user tool: every topic/candidate/decision is scoped to its
 * ownerUserId (schemas scope read to its owner), so there is no shared room. This spec
 * verifies the per-user boundary holds: two accounts sign in to separate browser
 * contexts, each lands its own signed-in shell, and each sidebar shows its own
 * account identity (not the other user's).
 *
 * The `users` fixture resolves accounts by name from the local registry
 * (`npx deepspace test-accounts create`), signs each in once via the email path,
 * and caches storageState per account. These two accounts ship with the harness;
 * create them if missing:
 *   npx deepspace test-accounts create --email rt-collab-a@deepspace.test --password TestPass123! --name "rt-collab-a"
 *   npx deepspace test-accounts create --email rt-collab-b@deepspace.test --password TestPass123! --name "rt-collab-b"
 */
import { test, expect } from 'deepspace/testing'

test('two users each land their own scoped shell', async ({ users }) => {
  const [a, b] = await users(['rt-collab-a', 'rt-collab-b'])

  await Promise.all([a.page.goto('/topics'), b.page.goto('/topics')])

  // Both reach the signed-in shell independently.
  await expect(a.page.locator('aside')).toBeVisible({ timeout: 15_000 })
  await expect(b.page.locator('aside')).toBeVisible({ timeout: 15_000 })

  // Each sidebar shows its own account name and the "Signed in" label.
  await expect(a.page.locator('aside').getByText(a.name)).toBeVisible({ timeout: 10_000 })
  await expect(b.page.locator('aside').getByText(b.name)).toBeVisible({ timeout: 10_000 })

  // A's shell never shows B's identity (per-user isolation).
  await expect(a.page.locator('aside').getByText(b.name)).toHaveCount(0)
})
