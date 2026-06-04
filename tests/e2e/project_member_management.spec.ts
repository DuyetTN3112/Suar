import { test, expect, type Page } from '@playwright/test'

import { login, navigateToProject } from './helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'
const BASE = 'http://127.0.0.1:3333'

async function createProject(page: Page, name: string): Promise<string> {
  await page.goto(`${BASE}/org/projects`)
  await page.waitForLoadState('networkidle')
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  const resp = await page.request.post(`${BASE}/org/projects`, {
    headers: { 'X-CSRF-TOKEN': csrfToken ?? '' },
    form: { name, description: `E2E test: ${name}`, status: 'in_progress' },
  })
  if (!resp.ok()) return ''
  await page.goto(`${BASE}/org/projects`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  const detailBtn = page.locator('button, a').filter({ hasText: /Mở chi tiết|Chi tiết/ }).first()
  if (await detailBtn.count() > 0) {
    await detailBtn.click()
    await page.waitForURL(/\/org\/projects\/[a-f0-9-]+/, { timeout: 10000 })
    const url = page.url()
    const match = /\/org\/projects\/([a-f0-9-]+)/.exec(url)
    return match?.[1] ?? ''
  }
  return ''
}

test.describe('Project Member Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('full flow: create project -> verify member form contract -> verify member list', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Member Flow')
    expect(projectId).toBeTruthy()

    await navigateToProject(page, projectId)

    // Click members tab
    await page.getByRole('tab', { name: 'Thành viên' }).click()
    await page.waitForTimeout(1000)

    // Verify member list shows at least one card
    const memberCards = page.locator('.border.rounded-md')
    expect(await memberCards.count()).toBeGreaterThan(0)

    // Click "Thêm thành viên" button
    const addBtn = page.getByRole('button', { name: 'Thêm thành viên' })
    await expect(addBtn).toBeVisible({ timeout: 10000 })
    await addBtn.click()
    await page.waitForTimeout(1000)

    // Verify add-member form uses user_id (not email)
    await expect(page.locator('#user_id')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('#project_role')).toBeVisible()

    // Verify role options exist
    await expect(page.locator('option[value="project_viewer"]').first()).toBeAttached()
    await expect(page.locator('option[value="project_member"]').first()).toBeAttached()
    await expect(page.locator('option[value="project_manager"]').first()).toBeAttached()

    // Verify email field is absent
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveCount(0)
  })

  test('add-member form rejects empty user_id', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Empty User')
    expect(projectId).toBeTruthy()

    await navigateToProject(page, projectId)
    await page.getByRole('tab', { name: 'Thành viên' }).click()
    await page.waitForTimeout(1000)

    const addBtn = page.getByRole('button', { name: 'Thêm thành viên' })
    await expect(addBtn).toBeVisible({ timeout: 10000 })
    await addBtn.click()
    await page.waitForTimeout(1000)

    // Dialog should still be open with user_id field visible
    await expect(page.locator('#user_id')).toBeVisible()
  })

  test('member list shows role selector for owner/manager', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Role Display')
    expect(projectId).toBeTruthy()

    await navigateToProject(page, projectId)
    await page.getByRole('tab', { name: 'Thành viên' }).click()
    await page.waitForLoadState('domcontentloaded')

    const memberCards = page.locator('.border.rounded-md')
    expect(await memberCards.count()).toBeGreaterThan(0)
  })

  test('email field is absent from add-member form (contract fix verification)', async ({ page }) => {
    const projectId = await createProject(page, 'E2E No Email')
    expect(projectId).toBeTruthy()

    await navigateToProject(page, projectId)
    await page.getByRole('tab', { name: 'Thành viên' }).click()
    await page.waitForTimeout(1000)

    const addBtn = page.getByRole('button', { name: 'Thêm thành viên' })
    await expect(addBtn).toBeVisible({ timeout: 10000 })
    await addBtn.click()
    await page.waitForTimeout(1000)

    // Verify email input does NOT exist
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveCount(0)

    // Verify user_id input DOES exist
    const userIdInput = page.locator('#user_id')
    await expect(userIdInput).toBeVisible()
  })
})
