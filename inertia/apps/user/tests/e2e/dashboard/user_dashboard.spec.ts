import { resolve } from 'node:path'

import { expect, test } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/dashboard')

test.describe('User dashboard', () => {
  test('renders personal command center with user review/work links', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
    })

    await login(page, E2E_USER)
    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: /Hôm nay của/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Task review board/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Review người giao việc/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Đề xuất của tôi/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Review cần làm/ })).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('500')
    expect(pageErrors).toEqual([])

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/dashboard-desktop.png`,
      fullPage: true,
    })
  })

  test('root lands on the personal command center for regular user work', async ({ page }) => {
    await login(page, E2E_USER)
    await page.goto('/')

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: /Hôm nay của/ })).toBeVisible()
  })

  test('fits mobile viewport without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await login(page, E2E_USER)
    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: /Hôm nay của/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Review môi trường/ })).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    )
    expect(hasHorizontalOverflow).toBe(false)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/dashboard-mobile.png`,
      fullPage: true,
    })
  })
})
