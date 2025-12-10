import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Org Dashboard Decision Hub', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('exposes three management domains with primary CTAs', async ({ page }) => {
    await page.goto('/org')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Tổng quan tổ chức' })).toBeVisible()
    await expect(page.getByText('Thành viên', { exact: true })).toBeVisible()
    await expect(page.getByText('Dự án', { exact: true })).toBeVisible()
    await expect(page.getByText('Task', { exact: true })).toBeVisible()
    await expect(page.getByText('Rủi ro', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Board task' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Cấu hình' })).toBeVisible()
  })

  test('risk metric opens task review board instead of separate dispute inbox', async ({ page }) => {
    await page.goto('/org')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: /Rủi ro/i }).click()

    await expect(page).toHaveURL(/\/org\/reviews\/task-board/)
    await expect(page.getByRole('heading', { level: 1, name: /Task review board/i })).toBeVisible()
  })
})
