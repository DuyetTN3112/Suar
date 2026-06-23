import { test, expect } from '@playwright/test'

import { login } from '../helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('User/Org/Admin Review Chain', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('user surface shows friendly table headers not raw IDs', async ({ page }) => {
    await page.goto('/reviews/reverse-reviews')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /reverse reviews/i })).toBeVisible()

    // Table headers should show friendly labels
    const hasTargetHeader = await page.locator('th:has-text("Target"), th:has-text("Target type")').count() > 0
    const hasEmptyState = await page.locator('text=No reverse reviews found').count() > 0

    expect(hasTargetHeader || hasEmptyState).toBeTruthy()
  })

  test('user surface does not expose raw UUIDs in table cells', async ({ page }) => {
    await page.goto('/reviews/reverse-reviews')
    await page.waitForLoadState('networkidle')

    const hasTable = await page.locator('[data-testid="reverse-review-table"]').count() > 0
    if (hasTable) {
      const tableText = await page.locator('[data-testid="reverse-review-table"]').innerText()
      const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i
      const rawUuids = (uuidPattern.exec(tableText)) ?? []
      expect(rawUuids.length).toBe(0)
    }
  })

  test('org surface renders for org owner', async ({ page }) => {
    await page.goto('/org/reverse-reviews')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /reverse reviews/i })).toBeVisible()
  })

  test('admin surface redirects non-admin to root', async ({ page }) => {
    await page.goto('/admin/reverse-reviews')

    await page.waitForURL('/')
    expect(page.url()).toMatch(/\/$/)
  })
})
