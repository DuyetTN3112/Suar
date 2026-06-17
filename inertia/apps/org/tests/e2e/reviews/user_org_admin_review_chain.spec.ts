import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'
import { seedReverseReviewFlow } from '../../shared/e2e/support/seeded_reverse_reviews.js'

test.describe('User/Org/Admin Review Chain', () => {
  test('org surface renders for org owner', async ({ page }) => {
    const seeded = await seedReverseReviewFlow(page)
    await login(page, seeded.orgOwnerEmail)
    await page.goto('/org/reverse-reviews')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('heading', { name: /lịch sử review môi trường/i })).toBeVisible()
  })

  test('admin surface redirects non-admin to root', async ({ page }) => {
    const seeded = await seedReverseReviewFlow(page)
    await login(page, seeded.userEmail)
    await page.goto('/admin/reverse-reviews')

    await page.waitForURL(/\/org/)
    expect(page.url()).toContain('/org')
  })
})
