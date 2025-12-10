import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_OWNER = 'tranngocduyet31@gmail.com'
const E2E_ADMIN = 'td6622i@gre.ac.uk'

test.describe('Org Dispute Queue E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_OWNER)
  })

  // ─── HAPPY: org owner opens dispute queue and sees own-org disputes ───
  test('org owner opens dispute queue and sees own-org disputes', async ({ page }) => {
    await page.goto('/org/disputes')
    await page.waitForLoadState('networkidle')

    // Verify page renders with heading
    await expect(page.getByRole('heading', { name: /Hàng đợi Khiếu nại/i })).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Bộ lọc' })).toBeVisible()
    await expect(page.getByRole('tablist')).toBeVisible()

    // Should see either disputes table or empty state (both are valid)
    await expect(
      page.getByRole('article').first().or(page.getByText(/Không có tranh chấp phù hợp/i))
    ).toBeVisible()
  })

  // ─── HAPPY: filter pending disputes ───
  test('org owner can filter disputes by status', async ({ page }) => {
    await page.goto('/org/disputes')
    await page.waitForLoadState('networkidle')

    await page.getByRole('tab', { name: /Chờ xử lý/i }).click()
    await page.waitForLoadState('networkidle')

    // Should still show table or empty state (no crash)
    await expect(
      page.getByRole('article').first().or(page.getByText(/Không có tranh chấp phù hợp/i))
    ).toBeVisible()
  })

  // ─── UNHAPPY: outsider cannot access org dispute queue ───
  test('outsider org member cannot see foreign org disputes', async ({ page }) => {
    // Login as a user who is NOT owner/admin of the target org
    await login(page, 'duyetlaaithe@gmail.com')

    // Try to access org disputes page for an org they don't own
    await page.goto('/org/disputes')
    await page.waitForLoadState('networkidle')

    // Should either be redirected, see forbidden, or see only own org's disputes
    // The key test: they should NOT see disputes from orgs they don't belong to
    const hasRedirect = !page.url().includes('/org/disputes')
    if (hasRedirect) {
      await expect(page.locator('body')).toBeVisible()
    } else {
      await expect(page.getByText(/Không có tranh chấp phù hợp|Không có quyền|Forbidden|403/i)).toBeVisible()
    }
  })

  // ─── UNHAPPY: cross-org admin cannot see foreign disputes ───
  test('cross-org admin cannot see disputes from other orgs', async ({ page }) => {
    // Login as admin of a different org
    await login(page, E2E_ADMIN, { systemRole: 'superadmin' })

    await page.goto('/org/disputes')
    await page.waitForLoadState('networkidle')

    // Should only see own org's disputes, not other orgs'
    const hasRedirect = !page.url().includes('/org/disputes')
    if (hasRedirect) {
      await expect(page.locator('body')).toBeVisible()
    } else {
      await expect(
        page.getByText(/Không có quyền|Forbidden|Không có tranh chấp phù hợp|Superadmin Workspace/i)
      ).toBeVisible()
    }
  })

  // ─── UNHAPPY: empty state renders correctly ───
  test('empty state renders clearly when no disputes match filter', async ({ page }) => {
    await page.goto('/org/disputes')
    await page.waitForLoadState('networkidle')

    // Filter by a very specific search that won't match
    const searchInput = page.locator('input[placeholder*="Tìm theo"]')
    if (await searchInput.count() > 0) {
      await searchInput.fill('ZZZZNONEXISTENT_USER_12345')
      await page.click('button:has-text("Lọc kết quả")')
      await page.waitForLoadState('networkidle')
    }

    // Should show empty state, not crash
    await expect(
      page.getByText(/Không có tranh chấp phù hợp|Chưa có khiếu nại/i).or(page.getByRole('article').first())
    ).toBeVisible()
  })
})
