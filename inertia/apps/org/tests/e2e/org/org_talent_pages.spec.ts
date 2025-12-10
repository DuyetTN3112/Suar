import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_OWNER = 'tranngocduyet31@gmail.com'
const UUID_RE = /^[0-9a-f-]{36}$/i

interface SeedTalentResponse {
  data: {
    talentId: string
  }
}

async function expectOrgTalentsReady(page: import('@playwright/test').Page) {
  await expect(page.getByRole('heading', { name: /Danh bạ Talent/i })).toBeVisible()
  await expect(page.getByTestId('talent-search-keyword')).toBeVisible()
}

test.describe('Org Talent Pages E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_OWNER)
  })

  // ─── HAPPY: org admin searches talent and opens detail ───
  test('org admin searches talent and opens detail', async ({ page }) => {
    const seedResponse = await page.request.post('http://127.0.0.1:3333/api/testing/seed-e2e', {
      data: { timestamp: Date.now() },
    })
    expect(seedResponse.status()).toBe(200)
    const seedBody = (await seedResponse.json()) as SeedTalentResponse
    expect(seedBody.data.talentId).toMatch(UUID_RE)

    await page.goto('/org/talents')
    await expectOrgTalentsReady(page)

    await expect
      .poll(async () => page.getByRole('link', { name: /^Hồ sơ$/ }).count())
      .toBeGreaterThan(0)

    await page.getByRole('link', { name: /^Hồ sơ$/ }).first().click()
    await expect(page.locator('textarea#bookmark-notes')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  // ─── HAPPY: recruiter bookmarks talent from detail ───
  test('recruiter bookmarks talent from detail page', async ({ page }) => {
    const seedResponse = await page.request.post('http://127.0.0.1:3333/api/testing/seed-e2e', {
      data: { timestamp: Date.now() },
    })
    expect(seedResponse.status()).toBe(200)
    const seedBody = (await seedResponse.json()) as SeedTalentResponse
    expect(seedBody.data.talentId).toMatch(UUID_RE)

    await page.goto('/org/talents')
    await expectOrgTalentsReady(page)

    await expect
      .poll(async () => page.getByRole('link', { name: /^Hồ sơ$/ }).count())
      .toBeGreaterThan(0)

    await page.getByRole('link', { name: /^Hồ sơ$/ }).first().click()
    await expect(page.locator('textarea#bookmark-notes')).toBeVisible()

    // Verify bookmark form fields
    await expect(page.locator('input#bookmark-folder')).toBeVisible()

    // Fill bookmark details and save
    await page.fill('textarea#bookmark-notes', 'E2E testing bookmark notes')
    await page.fill('input#bookmark-folder', 'E2E Test Group')

    const saveBtn = page.locator('button:has-text("Lưu talent"), button:has-text("Cập nhật bookmark")').first()
    await saveBtn.click()

    // Verify saved state is reflected in page behavior
    await expect(page.getByText(/Đã lưu talent này trong recruiter bookmarks/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Cập nhật bookmark/i })).toBeVisible()
  })

  // ─── SAFETY: org talent shell renders stable listing state ───
  test('org talents page renders listing shell with results or empty state', async ({ page }) => {
    await page.goto('/org/talents')
    await expectOrgTalentsReady(page)

    await expect(
      page.getByRole('link', { name: /^Hồ sơ$/ }).first().or(page.getByText(/Không tìm thấy talent nào/i))
    ).toBeVisible()
  })

  // ─── UNHAPPY: malformed filter query does not crash ───
  test('malformed filter query does not crash page', async ({ page }) => {
    // Navigate with invalid query params
    await page.goto('/org/talents?filter=invalid&status=!!!&skill=')
    await expectOrgTalentsReady(page)

    // Page should render without crashing
    await expect(page.locator('text=500|Server Error|Lỗi hệ thống')).toHaveCount(0)
  })

  // ─── UNHAPPY: empty search result renders explicit state ───
  test('empty search result renders explicit empty state', async ({ page }) => {
    await page.goto('/org/talents')
    await expectOrgTalentsReady(page)

    // Search for non-existent talent
    await page.getByTestId('talent-search-keyword').fill('ZZZZNONEXISTENT_USER_XYZ')
    await page.getByRole('button', { name: /Tìm kiếm/i }).click()
    await expect(page).toHaveURL(/q=ZZZZNONEXISTENT_USER_XYZ/)

    await expect
      .poll(async () => {
        const emptyStateCount = await page.getByText(/Không tìm thấy talent nào/i).count()
        const resultCount = await page.getByRole('link', { name: /^Hồ sơ$/ }).count()
        return { emptyStateCount, resultCount }
      })
      .toEqual({ emptyStateCount: 1, resultCount: 0 })
  })
})
