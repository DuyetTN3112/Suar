import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Talent Directory and Bookmarks', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
    const seed = await page.request.post('http://127.0.0.1:3333/api/testing/seed-e2e', {
      data: { timestamp: Date.now() },
    })
    expect(seed.status(), await seed.text()).toBe(200)
  })

  test('talent directory renders heading and search form', async ({ page }) => {
    await page.goto('/org/talents')
    await page.waitForLoadState('networkidle')

    await expect(
      page.getByRole('heading', { name: /Danh bạ Talent|Organization talent directory/i })
    ).toBeVisible()
    await expect(page.getByTestId('talent-search-keyword')).toBeVisible()
    await expect(page.getByRole('button', { name: /Tìm kiếm|Search/i })).toBeVisible()
  })

  test('talent directory shows talent cards or empty state', async ({ page }) => {
    await page.goto('/org/talents')
    await page.waitForLoadState('networkidle')

    await expect(
      page
        .getByRole('link', { name: /^(Hồ sơ|Profile)$/i })
        .first()
        .or(page.getByText(/Không tìm thấy talent nào|No talent found/i))
    ).toBeVisible()
  })

  test('bookmarks workspace renders heading', async ({ page }) => {
    await page.goto('/org/bookmarks')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /Saved talent|Talent đã lưu/i })).toBeVisible()
  })

  test('bookmarks workspace shows bookmarks or empty state', async ({ page }) => {
    await page.goto('/org/bookmarks')
    await page.waitForLoadState('networkidle')

    await expect(
      page
        .getByRole('link', { name: /View profile|Xem hồ sơ/i })
        .first()
        .or(page.getByText(/No saved talent yet|Chưa có talent đã lưu/i))
    ).toBeVisible()
    await page.screenshot({
      path: 'test-results/e2e-visual/talent-discovery/02-bookmarks-workspace.png',
      fullPage: true,
    })
  })
})
