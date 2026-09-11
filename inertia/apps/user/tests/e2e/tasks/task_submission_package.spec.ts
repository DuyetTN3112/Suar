import { test, expect } from '@playwright/test'

import { ensurePersonaSession } from '../../shared/e2e/fixtures/auth_personas.js'
import {
  seedTaskSubmissionFlow,
  type SeededTaskSubmissionContext,
} from '../../shared/e2e/support/seeded_task_submission.js'

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

async function openTaskDrawer(
  page: import('@playwright/test').Page,
  seeded: SeededTaskSubmissionContext
) {
  await page.goto(`${BASE}/projects/${seeded.projectId}/tasks`)
  await page.waitForLoadState('domcontentloaded')
  await page.getByRole('button', { name: new RegExp(seeded.taskTitle) }).click()
  await expect(page.locator('[data-testid="task-drawer-work-surfaces"]')).toBeVisible()
}

async function moveTaskToDone(page: import('@playwright/test').Page, taskId: string) {
  const statusResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/v1/tasks/${taskId}/sort-order`) &&
      response.request().method() === 'PATCH'
  )
  await page.getByRole('button', { name: /^DONE$/i }).click()
  const response = await statusResponse
  expect(response.status(), await response.text()).toBeLessThan(400)
}

test.describe('Task completion without assignee submission', () => {
  test('assignee can move the task to Done without a report or evidence package', async ({
    page,
  }) => {
    const seeded = await seedTaskSubmissionFlow(page)
    await ensurePersonaSession(page, seeded.assigneeEmail, seeded.organizationId)
    await openTaskDrawer(page, seeded)

    await expect(page.getByRole('heading', { name: /Submission|Nộp bài/i })).toHaveCount(0)
    await expect(page.getByText(/Completion Report|Báo cáo hoàn thành/i)).toHaveCount(0)
    await expect(page.getByLabel(/Tóm tắt kết quả|Result summary/i)).toHaveCount(0)

    await moveTaskToDone(page, seeded.taskId)

    const detailResponse = await page.request.get(`${BASE}/api/v1/tasks/${seeded.taskId}`)
    expect(detailResponse.ok(), await detailResponse.text()).toBe(true)
    const detailPayload = (await detailResponse.json()) as {
      data?: { status?: string }
    }
    expect(detailPayload.data?.status).toBe('done')
  })

  test('outsider cannot see the assigned task or its optional governance controls', async ({
    page,
  }) => {
    const seeded = await seedTaskSubmissionFlow(page)
    await ensurePersonaSession(page, seeded.outsiderEmail, seeded.organizationId)
    await page.goto(`${BASE}/projects/${seeded.projectId}/tasks`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('button', { name: new RegExp(seeded.taskTitle) })).toHaveCount(0)
    await expect(page.locator('[data-testid="task-drawer-work-surfaces"]')).toHaveCount(0)
    await expect(page.getByText(/Nộp bài|Submission|Completion Report/i)).toHaveCount(0)
  })

  test('invalid task ID shows a not-found page instead of a server error', async ({ page }) => {
    const seeded = await seedTaskSubmissionFlow(page)
    await ensurePersonaSession(page, seeded.assigneeEmail, seeded.organizationId)
    await page.goto(`${BASE}/tasks/${seeded.taskId}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.goto(`${BASE}/tasks/00000000-0000-0000-0000-000000000000`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/errors\/not-found$/)
    await expect(page.getByText(/Không tìm thấy công việc/i)).toBeVisible()
    await expect(page.locator('text=E_ROW_NOT_FOUND')).toHaveCount(0)
    await expect(page.locator('text=500|Server Error|Lỗi hệ thống')).toHaveCount(0)
  })
})
