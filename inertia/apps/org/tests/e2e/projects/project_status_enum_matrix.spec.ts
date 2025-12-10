/**
 * E2E Test Matrix: ProjectStatus Enum Sync
 *
 * Browser suite keeps only UI-visible behavior:
 * - valid create flow through org projects form
 * - select options stay aligned with backend enum
 * - rendered labels stay user-correct
 * - fake-pass DOM injection still gets rejected by backend
 */

import { test, expect, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'
import { seedProjectMemberFlow } from '../../shared/e2e/support/seeded_project_member_flow.js'

const BASE = 'http://127.0.0.1:3333'

test.describe.configure({ mode: 'serial' })

async function ensureLoggedIn(page: Page) {
  const seeded = await seedProjectMemberFlow(page)
  await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
  await page.goto(`${BASE}/org/projects`)
  await expect(page.getByRole('heading', { name: /Danh mục dự án/i })).toBeVisible()
}

async function openCreateProjectForm(page: Page) {
  await ensureLoggedIn(page)

  await page.getByRole('button', { name: /Tạo dự án mới/i }).click()
  await expect(page.getByRole('heading', { name: /Tạo project/i })).toBeVisible()
  await expect(page.locator('#status')).toBeVisible()
}

async function createProjectViaUI(
  page: Page,
  name: string,
  statusValue: string
): Promise<{ success: boolean; errorMessage?: string }> {
  await openCreateProjectForm(page)

  await page.fill('#name', name)
  await page.fill('#description', `E2E UI enum test: ${name}`)
  await page.selectOption('#status', statusValue)
  await page.getByRole('button', { name: /^Tiếp theo$/ }).click()
  await page.getByRole('button', { name: /^Tiếp theo$/ }).click()
  await page.getByRole('button', { name: /^Tạo project$/ }).click()

  const errorEl = page.locator('p.text-destructive').first()
  const createdProjectHeading = page.getByRole('heading', { name, exact: true })

  await Promise.race([
    createdProjectHeading.waitFor({ state: 'visible', timeout: 10000 }),
    errorEl.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined),
  ])

  if (await errorEl.isVisible().catch(() => false)) {
    return { success: false, errorMessage: await errorEl.textContent() ?? undefined }
  }

  await expect(createdProjectHeading).toBeVisible()
  return { success: true }
}

test.describe('ProjectStatus Enum UI Contract', () => {
  test('UI create accepts pending status', async ({ page }) => {
    const uniqueName = `HC-UI-pending-${Date.now()}`
    const result = await createProjectViaUI(page, uniqueName, 'pending')
    expect(result.success).toBe(true)
  })

  test('UI create accepts in_progress status', async ({ page }) => {
    const uniqueName = `HC-UI-progress-${Date.now()}`
    const result = await createProjectViaUI(page, uniqueName, 'in_progress')
    expect(result.success).toBe(true)
  })

  test('status select excludes legacy values', async ({ page }) => {
    await openCreateProjectForm(page)

    for (const val of ['active', 'on_hold', 'archived']) {
      await expect(page.locator(`#status option[value="${val}"]`)).toHaveCount(0)
    }
  })

  test('status select includes all valid backend enum values', async ({ page }) => {
    await openCreateProjectForm(page)

    for (const val of ['pending', 'in_progress', 'completed', 'cancelled']) {
      await expect(page.locator(`#status option[value="${val}"]`)).toHaveCount(1)
    }
  })

  test('project list renders current status labels for created records', async ({ page }) => {
    const uniqueName = `HC-UI-label-${Date.now()}`
    const result = await createProjectViaUI(page, uniqueName, 'completed')
    expect(result.success).toBe(true)

    await page.goto(`${BASE}/org/projects`)
    await expect(page.getByRole('heading', { name: /Danh mục dự án/i })).toBeVisible()

    const row = page.getByRole('row').filter({ hasText: uniqueName }).first()
    await expect(row).toContainText(/Hoàn thành/i)
  })

  test('valid UI form submission does not surface validation error', async ({ page }) => {
    const uniqueName = `UH-UI-valid-${Date.now()}`
    const result = await createProjectViaUI(page, uniqueName, 'cancelled')
    expect(result.success).toBe(true)
    expect(result.errorMessage).toBeUndefined()
  })

  test('fake-pass DOM injection of active status is rejected', async ({ page }) => {
    await openCreateProjectForm(page)

    const uniqueName = `UH-UI-inject-${Date.now()}`

    await page.fill('#name', uniqueName)
    await page.fill('#description', 'Fake pass detection test')

    await page.evaluate(() => {
      const select = document.getElementById('status') as HTMLSelectElement | null
      if (!select) return

      const option = document.createElement('option')
      option.value = 'active'
      option.textContent = 'Fake Active'
      select.appendChild(option)
      select.value = 'active'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })

    await page.getByRole('button', { name: /^Tiếp theo$/ }).click()
    await page.getByRole('button', { name: /^Tiếp theo$/ }).click()
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/projects') &&
      response.request().method() === 'POST'
    )
    await page.getByRole('button', { name: /^Tạo project$/ }).click()

    const response = await responsePromise
    expect(response.status()).toBe(302)
    await page.goto(`${BASE}/org/projects`)
    await expect(page.getByRole('heading', { name: /Danh mục dự án/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: uniqueName, exact: true })).toHaveCount(0)
  })
})
