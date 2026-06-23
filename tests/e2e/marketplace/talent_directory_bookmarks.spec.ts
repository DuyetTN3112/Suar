import { test, expect } from '@playwright/test'

import { login } from '../helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Talent Directory and Bookmarks', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('talent directory renders heading and search form', async ({ page }) => {
    await page.goto('/marketplace/talents')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /talent directory/i })).toBeVisible()
    await expect(page.locator('input#talent-search-keyword')).toBeVisible()
    await expect(page.locator('button:has-text("Search")')).toBeVisible()
  })

  test('talent directory shows talent cards or empty state', async ({ page }) => {
    await page.goto('/marketplace/talents')
    await page.waitForLoadState('networkidle')

    const hasTalents = await page.locator('.grid.gap-4').count() > 0
    const hasEmptyState = await page.locator('text=No talent matched current filters').count() > 0
    expect(hasTalents || hasEmptyState).toBeTruthy()
  })

  test('bookmarks workspace renders heading', async ({ page }) => {
    await page.goto('/marketplace/bookmarks')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /recruiter bookmarks/i })).toBeVisible()
  })

  test('bookmarks workspace shows bookmarks or empty state', async ({ page }) => {
    await page.goto('/marketplace/bookmarks')
    await page.waitForLoadState('networkidle')

    const hasBookmarks = await page.locator('.grid.gap-4').count() > 0
    const hasEmptyState = await page.locator('text=No bookmarks matched current filters').count() > 0
    expect(hasBookmarks || hasEmptyState).toBeTruthy()
  })
})
