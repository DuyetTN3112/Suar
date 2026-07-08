import { test, expect } from '@playwright/test'

import { ensurePersonaSession } from '../../shared/e2e/fixtures/auth_personas.js'
import { seedProjectMemberFlow } from '../../shared/e2e/support/seeded_project_member_flow.js'

test.describe('Match Score Explainability E2E', () => {
  test('task applications page shows match explanation badges for ranked candidates', async ({ page }) => {
    const seeded = await seedProjectMemberFlow(page)
    await ensurePersonaSession(page, seeded.ownerEmail, seeded.organizationId)

    await page.goto(`/tasks/${seeded.taskId}/applications`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('heading', { name: /đề xuất tham gia/i })).toBeVisible()

    const rows = page.getByTestId('application-row')
    const emptyState = page.getByTestId('empty-state')
    await expect(rows.first().or(emptyState)).toBeVisible()

    if (await rows.count()) {
      await expect(page.getByRole('columnheader', { name: /nguồn/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /match score/i })).toBeVisible()
      await expect(rows.first()).toContainText(/trong dự án|trong tổ chức|bên ngoài/i)
      await expect(rows.first()).toContainText(/\d+%/)
      await expect(rows.first()).toContainText(/\d+ reviewed · \d+ imported/i)
      await expect(rows.first()).not.toContainText(/đang tải/i)
    } else {
      await expect(emptyState).toHaveText(/chưa có đề xuất tham gia nào/i)
    }
  })

  test('talent directory renders profile cards or empty state', async ({ page }) => {
    const seeded = await seedProjectMemberFlow(page)
    await ensurePersonaSession(page, seeded.ownerEmail, seeded.organizationId)
    await page.goto('/org/talents')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('heading', { name: /danh bạ talent/i })).toBeVisible()
    await expect(page.getByTestId('talent-search-task')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tìm kiếm' })).toBeVisible()

    const profileLinks = page.getByRole('link', { name: /^hồ sơ$/i })
    const emptyState = page.getByText(/không tìm thấy talent nào/i)
    await expect(profileLinks.first().or(emptyState)).toBeVisible()

    if (await profileLinks.count()) {
      await expect(profileLinks.first()).toBeVisible()
      const firstTalentCard = page.getByRole('article').first()
      await expect(firstTalentCard).toContainText(/Kỹ năng/i)
      await expect(firstTalentCard).toContainText(/Domain/i)
      await expect(firstTalentCard).toContainText(/Đúng hạn/i)
      await expect(firstTalentCard).toContainText(/Trust/i)
    } else {
      await expect(emptyState).toBeVisible()
    }
  })

  test('candidate without complete data does not show fake match reasons', async ({ page }) => {
    const seeded = await seedProjectMemberFlow(page)
    await ensurePersonaSession(page, seeded.ownerEmail, seeded.organizationId)
    await page.goto('/org/talents')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('heading', { name: /danh bạ talent/i })).toBeVisible()
    await expect(
      page.getByRole('link', { name: /^hồ sơ$/i }).first().or(page.getByText(/không tìm thấy talent nào/i))
    ).toBeVisible()

    const fakeReasons = await page.getByText(/Coming soon|Sắp có/i).count()
    expect(fakeReasons).toBe(0)
  })
})
