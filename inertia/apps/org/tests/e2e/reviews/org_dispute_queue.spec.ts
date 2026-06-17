import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Organization Dispute Queue E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('org disputes page renders header and layout', async ({ page }) => {
    await page.goto('/org/disputes')
    await page.waitForLoadState('networkidle')

    // Page title and headers
    await expect(page.getByRole('heading', { name: /Hàng đợi khiếu nại đánh giá/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Danh sách tranh chấp' })).toBeVisible()
  })

  test('org disputes page displays filter form and inputs', async ({ page }) => {
    await page.goto('/org/disputes')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Bộ lọc' })).toBeVisible()
    await expect(page.getByRole('tablist')).toBeVisible()
    await expect(page.getByRole('tab', { name: /Chờ xử lý/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Xóa filter/i })).toBeVisible()
  })

  test('org disputes page shows disputes table or empty state', async ({ page }) => {
    await page.goto('/org/disputes')
    await page.waitForLoadState('networkidle')

    await expect(
      page.getByRole('article').first().or(page.getByText(/Không có tranh chấp phù hợp/i))
    ).toBeVisible()
  })

  test('org disputes page does not leak raw UUIDs in visible table content', async ({ page }) => {
    await page.goto('/org/disputes')
    await page.waitForLoadState('networkidle')

    const rows = page.getByRole('article')
    if (await rows.count() === 0) {
      await expect(page.getByText(/Không có tranh chấp phù hợp/i)).toBeVisible()
      return
    }

    const mainText = await page.locator('main').innerText()
    const visibleTableText = mainText.replace(/\s+/g, ' ')
    const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i

    expect(uuidPattern.test(visibleTableText)).toBe(false)
  })
})
