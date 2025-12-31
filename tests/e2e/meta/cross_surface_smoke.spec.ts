import { test, expect } from '@playwright/test'

import { login } from '../helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Cross-Surface Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('dashboard loads without server errors', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })

  test('marketplace tasks page renders heading', async ({ page }) => {
    await page.goto('/marketplace/tasks')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible()
  })

  test('my applications page renders heading', async ({ page }) => {
    await page.goto('/my-applications')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /đơn ứng tuyển|my applications/i })).toBeVisible()
  })

  test('talent directory page renders heading', async ({ page }) => {
    await page.goto('/marketplace/talents')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /talent directory/i })).toBeVisible()
  })

  test('bookmarks workspace page renders heading', async ({ page }) => {
    await page.goto('/marketplace/bookmarks')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /recruiter bookmarks/i })).toBeVisible()
  })

  test('reverse reviews page renders heading', async ({ page }) => {
    await page.goto('/reviews/reverse-reviews')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /reverse reviews/i })).toBeVisible()
  })

  test('tasks page loads without server errors', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })
})
