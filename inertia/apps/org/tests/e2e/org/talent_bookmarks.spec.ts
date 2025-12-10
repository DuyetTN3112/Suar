import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Talent Directory and Bookmarks', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('talent directory renders heading and search form', async ({ page }) => {
    await page.goto('/org/talents')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /Danh bạ Talent/i })).toBeVisible()
    await expect(page.getByTestId('talent-search-task')).toBeVisible()
    await expect(page.getByRole('button', { name: /Tìm kiếm/i, exact: true })).toBeVisible()
  })

  test('talent directory shows talent cards or empty state', async ({ page }) => {
    await page.goto('/org/talents')
    await page.waitForLoadState('networkidle')

    await expect(
      page.getByRole('link', { name: /^Hồ sơ$/ }).first().or(page.getByText(/Không tìm thấy talent nào/i))
    ).toBeVisible()
  })

  test('bookmarks workspace renders heading', async ({ page }) => {
    await page.goto('/org/bookmarks')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Talent đã lưu', exact: true })).toBeVisible()
  })

  test('bookmarks workspace shows bookmarks or empty state', async ({ page }) => {
    await page.goto('/org/bookmarks')
    await page.waitForLoadState('networkidle')

    await expect(
      page.getByRole('link', { name: 'Xem hồ sơ' }).first().or(page.getByText(/Chưa có talent đã lưu/i))
    ).toBeVisible()
  })
})
