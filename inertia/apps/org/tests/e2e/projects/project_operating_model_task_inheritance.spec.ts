import { test, expect } from '@playwright/test'

import { ensurePersonaSession } from '../../shared/e2e/fixtures/auth_personas.js'
import { seedProjectMemberFlow } from '../../shared/e2e/support/seeded_project_member_flow.js'

test.describe('Project operating model task inheritance', () => {
  test('owner launches task from project role with inherited contract', async ({ page }) => {
    const seeded = await seedProjectMemberFlow(page)
    expect(seeded.skills).toHaveLength(4)
    expect(seeded.skills.filter((skill) => skill.categoryCode === 'technology')).toHaveLength(1)
    expect(seeded.skills.filter((skill) => skill.categoryCode === 'engineering')).toHaveLength(1)
    expect(seeded.skills.filter((skill) => skill.categoryCode === 'soft_skill')).toHaveLength(1)
    expect(seeded.skills.filter((skill) => skill.categoryCode === 'delivery')).toHaveLength(1)
    await ensurePersonaSession(page, seeded.ownerEmail, seeded.organizationId)

    await page.goto(`/org/projects/${seeded.projectId}?focus=operating_model`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('button', { name: /Operating model/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Operating Model$/i })).toBeVisible()
    await expect(page.getByText(/Role setup trước/i)).toBeVisible()
    await expect(page.getByText(/Sprint bỏ qua demo/i)).toBeVisible()

    const launchLink = page.getByRole('link', { name: /Tạo task/i }).first()
    await expect(launchLink).toBeVisible()
    await launchLink.click()
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/Áp theo role/i)).toBeVisible()
    await expect(page.getByText(/4 skill/i)).toBeVisible()
    await page.getByRole('tab', { name: /^Skills$/i }).click()
    const expectedSkills = [seeded.skills[0], seeded.skills[1], seeded.skills[2], seeded.skills[3]]
    for (const skill of expectedSkills) {
      if (!skill) {
        throw new Error('Operating model seed did not create expected skills')
      }
      await expect(page.locator('span.font-medium', { hasText: skill.name }).first()).toBeVisible()
    }
    await expect(
      page.getByText(/Gợi ý assignee/i).or(page.getByText(/Chưa có assignee phù hợp/i))
    ).toBeVisible()
  })
})
