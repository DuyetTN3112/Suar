import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'
import {
  cleanupSeedProjectMember,
  seedProjectMemberFlow,
} from '../../shared/e2e/support/seeded_project_member_flow.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Task Application Access', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('tasks page renders with content or empty state', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('region', { name: 'Quản lý nhiệm vụ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Trạng thái' })).toBeVisible()
  })

  test('authorized owner can navigate to task applications', async ({ page }) => {
    const seeded = await seedProjectMemberFlow(page)

    try {
      await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
      await page.goto(`/tasks/${seeded.taskId}/applications`)
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('heading', { name: 'Đề xuất tham gia' })).toBeVisible()
    } finally {
      await cleanupSeedProjectMember(page, seeded.timestamp)
    }
  })

  test('applications page shows heading when accessed via task', async ({ page }) => {
    const seeded = await seedProjectMemberFlow(page)

    try {
      await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
      await page.goto(`/tasks/${seeded.taskId}/applications`)
      await page.waitForLoadState('networkidle')

      await expect(page.getByRole('heading', { name: 'Đề xuất tham gia' })).toBeVisible()
    } finally {
      await cleanupSeedProjectMember(page, seeded.timestamp)
    }
  })

  test('applications page shows source column header', async ({ page }) => {
    const seeded = await seedProjectMemberFlow(page)

    try {
      await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
      await page.goto(`/tasks/${seeded.taskId}/applications`)
      await page.waitForLoadState('networkidle')

      const rows = page.locator('[data-testid="application-row"]')
      if (await rows.count() > 0) {
        await expect(page.locator('th:has-text("Nguồn")')).toBeVisible()
        await expect(rows.first()).toBeVisible()
      } else {
        await expect(page.locator('[data-testid="empty-state"]')).toHaveText('Chưa có đề xuất tham gia nào')
      }
    } finally {
      await cleanupSeedProjectMember(page, seeded.timestamp)
    }
  })
})
