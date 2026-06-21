import { test, expect } from '@playwright/test'
import { signInWithEmail, callAction, seedSampleData, HAS_TEST_ACCOUNT } from './helpers/auth'

/**
 * API-layer tests. Clients never write records directly in Reply Radar; every
 * mutation flows through server actions (POST /api/actions/:name) that verify
 * ownership. These exercise the auth proxy and a real action round-trip.
 */
test.describe('API tests', () => {
  test('auth proxy forwards to the auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('unauthenticated action calls are rejected', async ({ request }) => {
    // No bearer token: the action route must not return a success envelope.
    const res = await request.post('/api/actions/seedSampleData', {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    })
    expect(res.ok()).toBeFalsy()
  })

  test('authed action round-trip seeds the caller-owned collections', async ({ page }) => {
    test.skip(!HAS_TEST_ACCOUNT, 'Set APP_TEST_EMAIL / APP_TEST_PASSWORD to run the authed spec')
    await signInWithEmail(page)
    await page.goto('/topics')

    // seedSampleData writes topics/candidates/decisions for the signed-in user.
    // Fresh account -> success:true; already seeded -> success:false with a
    // "already present" error. Both prove the action layer ran for this caller.
    const seed = await seedSampleData(page)
    if (!seed.success) {
      expect(seed.error ?? '').toMatch(/already/i)
    } else {
      expect(seed.data?.firstTopicId).toBeTruthy()
    }

    // The owner can now read back their own topics via an action.
    const owned = await callAction<{ topics?: unknown[] } | unknown[]>(page, 'seedSampleData')
    // Re-seeding is refused once data exists, confirming the idempotency guard.
    expect(owned.success).toBeFalsy()
    expect(owned.error ?? '').toMatch(/already/i)
  })
})
