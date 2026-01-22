import { test, expect } from '@playwright/test'

import { ensurePersonaSession } from '../../shared/e2e/fixtures/auth_personas.js'
import { navigateToProject } from '../../shared/e2e/helpers.js'
import { seedProjectMemberFlow } from '../../shared/e2e/support/seeded_project_member_flow.js'

test.describe('Project Member Management E2E', () => {
  test('owner opens add-member dialog, sees user_id field, no email input', async ({ page }) => {
    const seeded = await seedProjectMemberFlow(page)
    await ensurePersonaSession(page, seeded.ownerEmail, seeded.organizationId)
    await navigateToProject(page, seeded.projectId)

    await page.getByRole('tab', { name: /Thành viên|Members/i }).click()
    await expect(page.getByRole('button', { name: /Thêm thành viên|Add member/i })).toBeVisible()

    await page.getByRole('button', { name: /Thêm thành viên|Add member/i }).click()

    await expect(page.locator('#user_id')).toBeVisible()
    await expect(page.locator('#project_role')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toHaveCount(0)
  })

  test('add-member form keeps submit disabled until user_id is selected', async ({ page }) => {
    const seeded = await seedProjectMemberFlow(page)
    await ensurePersonaSession(page, seeded.ownerEmail, seeded.organizationId)
    await navigateToProject(page, seeded.projectId)

    await page.getByRole('tab', { name: /Thành viên|Members/i }).click()
    await page.getByRole('button', { name: /Thêm thành viên|Add member/i }).click()

    await expect(page.locator('#user_id')).toBeVisible()
    await expect(page.locator('#user_id')).toHaveValue('')
    await expect(page.getByRole('button', { name: /^(Thêm|Add)$/i })).toBeDisabled()
    await expect(page.locator('#project_role')).toHaveValue('project_member')
  })

  test('member list shows at least one member card', async ({ page }) => {
    const seeded = await seedProjectMemberFlow(page)
    await ensurePersonaSession(page, seeded.ownerEmail, seeded.organizationId)
    await navigateToProject(page, seeded.projectId)

    await page.getByRole('tab', { name: /Thành viên|Members/i }).click()

    const membersPanel = page.getByRole('tabpanel', { name: /Thành viên|Members/i })
    await expect(membersPanel).toBeVisible()
    await expect(membersPanel.getByText(seeded.ownerEmail, { exact: false })).toBeVisible()
  })

  test('owner can add member by selecting from candidate list', async ({ page }) => {
    const seeded = await seedProjectMemberFlow(page)
    await ensurePersonaSession(page, seeded.ownerEmail, seeded.organizationId)
    await navigateToProject(page, seeded.projectId)

    await page.getByRole('tab', { name: /Thành viên|Members/i }).click()
    await page.getByRole('button', { name: /Thêm thành viên|Add member/i }).click()

    await expect(page.locator('#user_id')).toBeVisible()
    await page.locator('#user_id').selectOption(seeded.candidateId)
    await page.locator('#project_role').selectOption('project_member')

    const addMemberResponse = page.waitForResponse((response) =>
      response.url().includes('/projects/members') && response.request().method() === 'POST'
    )
    await page.getByRole('button', { name: /^(Thêm|Add)$/i }).click()
    const response = await addMemberResponse
    expect(response.status()).toBeLessThan(400)

    await expect(page.locator('#user_id')).toBeHidden()
    await page.getByRole('tab', { name: /Thành viên|Members/i }).click()

    await expect(
      page
        .getByRole('tabpanel', { name: /Thành viên|Members/i })
        .getByText(seeded.candidateEmail)
    ).toBeVisible()
  })
})
