import { test, expect, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const ADMIN_EMAIL = 'td6622i@gre.ac.uk'
const REGULAR_USER = 'tranngocduyet31@gmail.com'
const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

interface ActiveSkillRecord {
  id: string
  published_rubric_version_id?: string | null
}

async function findSkillIdWithPublishedRubric(page: Page) {
  const response = await page.request.get(`${BASE}/api/v1/skills`, {
    headers: { Accept: 'application/json' },
  })
  expect(response.status()).toBe(200)

  const payload = (await response.json()) as { data?: ActiveSkillRecord[] }
  expect(Array.isArray(payload.data)).toBe(true)
  const skill = payload.data?.find((record) => record.published_rubric_version_id)
  return skill?.id ?? null
}

test.describe('Admin Proficiency & Rubric Read Surface', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, { systemRole: 'superadmin' })
  })

  test('admin navigates to proficiency scale page and sees ordered levels', async ({ page }) => {
    await page.goto(`${BASE}/admin/proficiency`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForURL(/\/admin\/proficiency/)

    // Verify page shows the active scale name
    await expect(page.locator('h1')).toContainText('Proficiency Scale')

    // Verify levels table renders with ordinal, code, display name columns
    const table = page.locator('table')
    await expect(table).toBeVisible()

    const headerCells = table.locator('thead th')
    await expect(headerCells.nth(0)).toContainText('Ordinal')
    await expect(headerCells.nth(1)).toContainText('Code')
    await expect(headerCells.nth(2)).toContainText('Display Name')

    // Verify at least one level row renders
    const rows = table.locator('tbody tr')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)
  })

  test('admin opens proficiency detail and sees full level definitions', async ({ page }) => {
    await page.goto(`${BASE}/admin/proficiency`)
    await page.waitForLoadState('domcontentloaded')

    const activeScaleNameCell = page.locator('tbody tr').first().locator('td').nth(2)
    const activeScaleNameText = await activeScaleNameCell.textContent()
    const activeScaleName = activeScaleNameText?.trim()
    expect(activeScaleName).toMatch(/\S/)

    // Click "View details →" link
    await page.getByRole('link', { name: /View details/i }).click()
    await page.waitForURL(/\/admin\/proficiency\/[a-f0-9-]+/)

    // Verify detail page preserves selected scale metadata.
    await expect(page.getByRole('heading', { level: 3, name: activeScaleName ?? '' })).toBeVisible()
    await expect(page.getByText(/^v\d+$/).first()).toBeVisible()
    await expect(page.getByText('Active', { exact: true })).toBeVisible()

    // Verify levels table renders detail rows for the selected scale.
    const rows = page.locator('tbody tr')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)

    const firstRowCells = rows.first().locator('td')
    await expect(firstRowCells.first()).toContainText(/^\d+$/)
  })

  test('admin navigates to a skill rubric and sees level details with evidence guidance', async ({ page }) => {
    // First go to proficiency index to find a skill with rubric
    await page.goto(`${BASE}/admin/proficiency`)
    await page.waitForLoadState('domcontentloaded')

    const skillId = await findSkillIdWithPublishedRubric(page)
    expect(skillId, 'Active skills API must expose a published rubric').not.toBeNull()
    if (!skillId) {
      throw new Error('Active skills API returned no skill with a published rubric')
    }

    const response = await page.goto(`${BASE}/admin/proficiency/rubrics/${skillId}`)
    expect(response?.status(), `Rubric page must exist for skill ${skillId}`).toBe(200)

    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('h1')).toBeVisible()

    await expect(page.getByRole('heading', { name: /Rubric v\d+/ })).toBeVisible()

    const levelCards = page.locator('main > div > div.rounded-lg.border.p-4')
    await expect(levelCards.first()).toBeVisible()

    await expect(page.getByText('Evidence Guidance', { exact: true }).first()).toBeVisible()
  })

  test('non-admin user cannot access proficiency admin pages', async ({ page }) => {
    // Login as regular user
    await login(page, REGULAR_USER, { systemRole: 'registered_user' })

    // Try to access admin proficiency page
    await page.goto(`${BASE}/admin/proficiency`)
    await page.waitForLoadState('domcontentloaded')

    expect(new URL(page.url()).pathname).not.toBe('/admin/proficiency')
    await expect(page.getByRole('heading', { name: 'Proficiency Scale' })).toHaveCount(0)
    await expect(page.locator('table')).toHaveCount(0)
  })

  test('admin proficiency page shows empty state when no scale', async ({ page }) => {
    await page.goto(`${BASE}/admin/proficiency`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('heading', { name: 'Proficiency Scale' })).toBeVisible()

    const table = page.locator('table')
    const emptyState = page.getByText('No active proficiency scale found.', { exact: true })

    await expect(table.or(emptyState).first()).toBeVisible()
  })
})
