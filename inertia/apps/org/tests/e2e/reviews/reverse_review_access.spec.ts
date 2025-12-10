import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'
import { seedReverseReviewFlow } from '../../shared/e2e/support/seeded_reverse_reviews.js'

test.describe('Reverse Review Access Control', () => {
  test('org reverse reviews page accessible for org owner', async ({ page }) => {
    const seeded = await seedReverseReviewFlow(page)
    await login(page, seeded.orgOwnerEmail)
    await page.goto('/org/reverse-reviews')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('heading', { name: /lịch sử review môi trường/i })).toBeVisible()
  })

  test('admin reverse reviews redirects non-admin user', async ({ page }) => {
    const seeded = await seedReverseReviewFlow(page)
    await login(page, seeded.userEmail)
    await page.goto('/admin/reverse-reviews')

    await page.waitForURL(/\/org/)
    expect(page.url()).toContain('/org')
  })
})
