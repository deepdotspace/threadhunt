import { test, expect, type Page } from '@playwright/test'
import { captureConsoleErrors } from './helpers/errors'
import { signInWithEmail, seedSampleData, HAS_TEST_ACCOUNT } from './helpers/auth'

/**
 * Smoke tests for the real Reply Radar UI.
 *
 * Signed-out visitors get the marketing landing at /. The signed-in app lives
 * under the (protected) routes behind AuthGate: an AppShell with a sidebar
 * <aside> (Reply Radar mark, topics list, History, Settings) inside the
 * data-testid="app-root" container.
 *
 * Assertions lean on roles/text/testid rather than pixel/order so they survive
 * design tweaks.
 */

const APP_ROOT = '[data-testid="app-root"]'

/** Wait for the React root container to mount (present signed-in or out). */
async function waitForAppRoot(page: Page) {
  await page.waitForSelector(APP_ROOT, { timeout: 15_000 })
}

/** Wait for the signed-in shell: the sidebar <aside> rendered by AppShell. */
async function waitForShell(page: Page) {
  await page.waitForSelector('aside', { timeout: 15_000 })
}

test.describe('Signed-out landing', () => {
  test('app mounts without JS errors', async ({ page }) => {
    const errors = captureConsoleErrors(page)
    await page.goto('/')
    await waitForAppRoot(page)
    expect(errors).toEqual([])
  })

  test('landing renders with a Get started CTA', async ({ page }) => {
    await page.goto('/')
    await waitForAppRoot(page)
    // Hero headline and the primary CTA the landing exposes to open AuthOverlay.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('post them by hand')
    await expect(page.getByRole('button', { name: 'Get started' }).first()).toBeVisible()
    // No signed-in shell for an anonymous visitor.
    await expect(page.locator('aside')).toHaveCount(0)
  })

  test('Get started opens the sign-in overlay', async ({ page }) => {
    await page.goto('/')
    await waitForAppRoot(page)
    await page.getByRole('button', { name: 'Get started' }).first().click()
    await expect(page.locator('[data-testid="auth-overlay"]')).toBeVisible({ timeout: 10_000 })
  })

  test('unknown route shows the 404 screen', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz')
    await waitForAppRoot(page)
    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByText('Page not found')).toBeVisible()
  })
})

test.describe('Signed-in app', () => {
  test.skip(!HAS_TEST_ACCOUNT, 'Set APP_TEST_EMAIL / APP_TEST_PASSWORD to run the signed-in specs')
  test('email sign-in lands the app shell', async ({ page }) => {
    await signInWithEmail(page)
    await page.goto('/topics')
    await waitForShell(page)
    await expect(page.locator(APP_ROOT)).toBeVisible()
    // The sidebar carries the Reply Radar mark + wordmark.
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    await expect(sidebar.getByText('Reply Radar', { exact: true })).toBeVisible()
  })

  test('sidebar exposes New topic, History, and Settings nav', async ({ page }) => {
    await signInWithEmail(page)
    await page.goto('/topics')
    await waitForShell(page)
    const sidebar = page.locator('aside')
    await expect(sidebar.getByRole('link', { name: 'New topic' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'History' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Settings' })).toBeVisible()
  })

  test('navigates to History and Settings', async ({ page }) => {
    await signInWithEmail(page)
    await page.goto('/topics')
    await waitForShell(page)

    await page.locator('aside').getByRole('link', { name: 'History' }).click()
    await expect(page).toHaveURL(/\/history$/)
    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible()

    await page.locator('aside').getByRole('link', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })

  test('sidebar lists topics after seeding sample data', async ({ page }) => {
    await signInWithEmail(page)
    await page.goto('/topics')
    await waitForShell(page)

    // Idempotent-ish: succeeds on a fresh account, returns success:false once
    // the sample topics already exist. Either way the account ends up seeded.
    await seedSampleData(page)

    await page.reload()
    await waitForShell(page)
    const sidebar = page.locator('aside')
    // The TOPICS section header plus at least one seeded topic name.
    await expect(sidebar.getByText('Topics', { exact: true })).toBeVisible()
    await expect(sidebar.getByText('DeepSpace SDK')).toBeVisible({ timeout: 10_000 })
  })
})
