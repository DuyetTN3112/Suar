import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'
import {
  cleanupSeedProjectMember,
  seedProjectMemberFlow,
} from '../../shared/e2e/support/seeded_project_member_flow.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Task Application Triage E2E', () => {
  test('tasks page renders without 500 error', async ({ page }) => {
    await login(page, E2E_USER)
    await page.goto('/tasks')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('region', { name: 'Quản lý nhiệm vụ' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Trạng thái' })).toBeVisible()
    await expect(page.locator('text=500|Server Error|Lỗi hệ thống')).toHaveCount(0)
  })

  test('seeded task detail route loads without 500 error', async ({ page }) => {
    await login(page, E2E_USER)
    const seeded = await seedProjectMemberFlow(page)

    try {
      await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
      await page.goto(`/tasks/${seeded.taskId}`)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.locator('body')).not.toContainText('ForbiddenException')
      await expect(page.locator('text=500|Server Error|Lỗi hệ thống')).toHaveCount(0)
    } finally {
      await cleanupSeedProjectMember(page, seeded.timestamp)
    }
  })

  test('applications page shows source column or empty state', async ({ page }) => {
    await login(page, E2E_USER)
    const seeded = await seedProjectMemberFlow(page)

    try {
      await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
      await page.goto(`/tasks/${seeded.taskId}/applications`)
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByRole('heading', { name: 'Đề xuất tham gia' })).toBeVisible()

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

  test('applications page shows empty state or table rows', async ({ page }) => {
    await login(page, E2E_USER)
    const seeded = await seedProjectMemberFlow(page)

    try {
      await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
      await page.goto(`/tasks/${seeded.taskId}/applications`)
      await page.waitForLoadState('domcontentloaded')

      const rows = page.locator('[data-testid="application-row"]')
      if (await rows.count() > 0) {
        await expect(rows.first()).toBeVisible()
      } else {
        await expect(page.locator('[data-testid="empty-state"]')).toHaveText('Chưa có đề xuất tham gia nào')
      }
    } finally {
      await cleanupSeedProjectMember(page, seeded.timestamp)
    }
  })
})
