import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Auth logout E2E', () => {
  test('logout clears browser session and protected pages require login again', async ({
    page,
  }) => {
    await login(page, E2E_USER)
    await page.goto('/profile')
    await page.waitForLoadState('domcontentloaded')
    await expect(
      page.getByRole('heading', { name: /^(Capability dossier|Hồ sơ năng lực)$/i })
    ).toBeVisible()

    await page.goto('/logout')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: /^(Login|Đăng nhập)$/i })).toBeVisible()

    await page.goto('/profile')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: /^(Login|Đăng nhập)$/i })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /^(Capability dossier|Hồ sơ năng lực)$/i })
    ).toHaveCount(0)
  })

  test('guest logout route redirects to login without restoring a session', async ({ page }) => {
    await page.goto('/logout')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: /^(Login|Đăng nhập)$/i })).toBeVisible()

    await page.goto('/profile')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/login/)
    await expect(
      page.getByRole('heading', { name: /^(Capability dossier|Hồ sơ năng lực)$/i })
    ).toHaveCount(0)
  })
})
