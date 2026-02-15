import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Cross-Surface Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('organization dashboard renders current org overview', async ({ page }) => {
    await page.goto('/org')
    await expect(page).toHaveURL(/\/org$/)
    await expect(
      page.getByRole('heading', { name: /Tổng quan tổ chức|Organization overview/i })
    ).toBeVisible()
  })

  test('marketplace tasks page renders heading', async ({ page }) => {
    await page.goto('/marketplace/tasks')

    await expect(
      page.getByRole('heading', { name: /^(Thị trường task|Task marketplace)$/i })
    ).toBeVisible()
  })

  test('my applications page renders heading', async ({ page }) => {
    await page.goto('/my-applications')

    await expect(
      page.getByRole('heading', { name: /đề xuất tham gia của tôi|My applications/i })
    ).toBeVisible()
  })

  test('talent directory page renders heading', async ({ page }) => {
    await page.goto('/org/talents')

    await expect(
      page.getByRole('heading', { name: /danh bạ talent tổ chức|Organization talent directory/i })
    ).toBeVisible()
  })

  test('bookmarks workspace page renders heading', async ({ page }) => {
    await page.goto('/org/bookmarks')

    await expect(
      page.getByRole('heading', { name: /^(Talent đã lưu|Saved talent)$/i })
    ).toBeVisible()
  })

  test('tasks page loads without server errors', async ({ page }) => {
    await page.goto('/tasks')
    await expect(page.locator('body')).toBeVisible()

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|internal server error/i)
  })
})
