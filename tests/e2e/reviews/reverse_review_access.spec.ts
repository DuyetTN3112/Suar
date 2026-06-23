import { test, expect } from '@playwright/test'

import { login } from '../helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Reverse Review Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('user reverse reviews page renders heading and stats', async ({ page }) => {
    await page.goto('/reviews/reverse-reviews')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /reverse reviews/i })).toBeVisible()
    // Stats badge
    await expect(page.locator('text=Total')).toBeVisible()
  })

  test('user reverse reviews shows table with data or empty state', async ({ page }) => {
    await page.goto('/reviews/reverse-reviews')
    await page.waitForLoadState('networkidle')

    const hasTable = await page.locator('[data-testid="reverse-review-table"]').count() > 0
    const hasEmptyState = await page.locator('text=No reverse reviews found').count() > 0
    expect(hasTable || hasEmptyState).toBeTruthy()
  })

  test('org reverse reviews page accessible for org owner', async ({ page }) => {
    await page.goto('/org/reverse-reviews')
    await page.waitForLoadState('networkidle')

    // User is org_owner in test org, so page should render
    await expect(page.getByRole('heading', { name: /reverse reviews/i })).toBeVisible()
  })

  test('admin reverse reviews redirects non-admin user', async ({ page }) => {
    await page.goto('/admin/reverse-reviews')

    // Non-admin user should be redirected to /
    await page.waitForURL('/')
    expect(page.url()).toMatch(/\/$/)
  })
})
