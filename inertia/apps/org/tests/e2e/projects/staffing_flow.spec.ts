import { test, expect } from '@playwright/test'

import { ensurePersonaSession } from '../../shared/e2e/fixtures/auth_personas.js'
import { login, createProject } from '../../shared/e2e/helpers.js'
import { seedProjectMemberFlow } from '../../shared/e2e/support/seeded_project_member_flow.js'

const E2E_USER = 'tranngocduyet31@gmail.com'
async function openMembersTab(page: import('@playwright/test').Page) {
  await page.getByRole('tab', { name: /Thành viên/i }).click()
  await expect(page.getByRole('button', { name: /Thêm thành viên/i })).toBeVisible()
}

test.describe('End-to-End Staffing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('create project → verify member form contract', async ({ page }) => {
    await createProject(page, 'E2E Staffing Flow')
    await openMembersTab(page)

    await page.getByRole('button', { name: /Thêm thành viên/i }).click()

    // Verify email input is NOT present
    await expect(page.locator('input[type="email"]')).toHaveCount(0)

    // Member search and selection flow should be visible
    await expect(page.locator('#member_search')).toBeVisible()
    await expect(page.locator('#member_search')).toHaveAttribute('placeholder', 'Tìm theo tên hoặc email...')
    await expect(page.locator('#user_id')).toBeVisible()
    await expect(page.locator('#user_id')).toHaveValue('')

    // Verify role selector
    await expect(page.locator('#project_role')).toBeVisible()
    await expect(page.locator('#project_role option')).toHaveCount(3)
    await expect(page.getByRole('button', { name: 'Thêm', exact: true })).toBeDisabled()

    await page.keyboard.press('Escape')
  })

  test('project member list shows at least the owner', async ({ page }) => {
    await createProject(page, 'E2E Member List')
    await openMembersTab(page)

    const memberCards = page.locator('.border.rounded-md')
    await expect(memberCards.first()).toBeVisible()
    await expect(memberCards.filter({ hasText: E2E_USER }).first()).toBeVisible()
  })

  test('member card has role selector', async ({ page }) => {
    await createProject(page, 'E2E Role Selector')
    await openMembersTab(page)

    const memberCard = page.locator('.border.rounded-md').filter({ hasText: E2E_USER }).first()
    await expect(memberCard).toBeVisible()

    const roleSelect = memberCard.locator('label:has-text("Governance role") select').first()
    await expect(roleSelect).toBeVisible()
    await expect(roleSelect.locator('option')).toHaveCount(3)
  })

  test('candidate source labels show on applications page', async ({ page }) => {
    const seeded = await seedProjectMemberFlow(page)
    await ensurePersonaSession(page, seeded.ownerEmail, seeded.organizationId)

    await page.goto(`/tasks/${seeded.taskId}/applications`)
    await expect(page.getByRole('heading', { name: /đề xuất tham gia/i })).toBeVisible()

    const hasSourceCol = await page.locator('th:has-text("Nguồn")').count() > 0
    const hasEmptyState = await page.locator('[data-testid="empty-state"]').count() > 0
    expect(hasSourceCol || hasEmptyState).toBeTruthy()
  })
})
