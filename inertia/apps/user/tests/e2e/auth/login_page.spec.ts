import { test, expect } from '@playwright/test'

test.describe('Auth login page E2E', () => {
  test('guest sees OAuth-only provider entry surface', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('heading', { name: /^(Login|Đăng nhập)$/i })).toBeVisible()

    const googleLink = page.getByRole('link', { name: 'Google' })
    const githubLink = page.getByRole('link', { name: 'GitHub' })

    await expect(googleLink).toBeVisible()
    await expect(googleLink).toHaveAttribute('href', '/auth/google/redirect')
    await expect(githubLink).toBeVisible()
    await expect(githubLink).toHaveAttribute('href', '/auth/github/redirect')

    await expect(page.locator('input[type="password"]')).toHaveCount(0)
    await expect(page.locator('input[name="email"], input[type="email"]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /login|đăng nhập/i })).toHaveCount(0)
  })
})
