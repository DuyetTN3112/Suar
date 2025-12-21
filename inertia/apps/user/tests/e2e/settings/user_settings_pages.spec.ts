import { resolve } from 'node:path'

import { expect, test } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/user-settings')

test.describe('User settings pages', () => {
  test('merged account settings render and display settings stay hidden', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
    })

    await login(page, E2E_USER)

    await page.goto('/settings/profile')
    await expect(page).toHaveURL(/\/settings\/account$/)
    await expect(
      page.getByRole('heading', { name: /Tài khoản & thông tin cá nhân|Account & personal information/ })
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: /Thông tin cá nhân|Personal information/ })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('500')
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/account-settings.png`,
      fullPage: true,
    })

    await page.goto('/settings')
    await expect(page.getByRole('heading', { level: 1, name: /Cài đặt|Settings/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Giao diện|Appearance/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Hiển thị|Display/ })).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('500')
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/settings-index.png`,
      fullPage: true,
    })

    expect(pageErrors).toEqual([])
  })
})
