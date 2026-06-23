import { test, expect } from '@playwright/test'

import { login } from '../helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Marketplace Apply and My Applications', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('marketplace tasks page renders with task data or empty state', async ({ page }) => {
    await page.goto('/marketplace/tasks')
    await page.waitForLoadState('networkidle')

    // The page heading should be visible
    await expect(page.getByRole('heading', { name: /marketplace/i })).toBeVisible()

    // Either task cards or empty state
    const hasTaskCards = await page.locator('.marketplace-page .space-y-4').count() > 0
    const hasEmptyState = await page.locator('text=Không tìm thấy nhiệm vụ nào').count() > 0
    expect(hasTaskCards || hasEmptyState).toBeTruthy()
  })

  test('my applications page renders heading', async ({ page }) => {
    await page.goto('/my-applications')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /đơn ứng tuyển của tôi|my applications/i })).toBeVisible()
  })

  test('my applications shows empty state or application list', async ({ page }) => {
    await page.goto('/my-applications')
    await page.waitForLoadState('networkidle')

    const hasApplications = await page.locator('[data-testid="application-row"]').count() > 0
    const hasEmptyState = await page.locator('[data-testid="empty-state"]').count() > 0
    expect(hasApplications || hasEmptyState).toBeTruthy()
  })

  test('my applications has status filter tabs', async ({ page }) => {
    await page.goto('/my-applications')
    await page.waitForLoadState('networkidle')

    // Filter buttons should be present
    const filterContainer = page.locator('.flex.flex-wrap.gap-2')
    await expect(filterContainer).toBeVisible()
  })
})
