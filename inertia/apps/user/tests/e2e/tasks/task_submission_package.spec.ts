import { test, expect } from '@playwright/test'

import { ensurePersonaSession } from '../../shared/e2e/fixtures/auth_personas.js'
import { seedTaskSubmissionFlow } from '../../shared/e2e/support/seeded_task_submission.js'

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

async function openSubmissionTab(page: import('@playwright/test').Page) {
  await page.getByRole('tab', { name: 'Nộp bài' }).click()
  await expect(page.getByRole('heading', { name: /Báo cáo hoàn thành công việc/i })).toBeVisible()
}

test.describe('Task Submission Package E2E', () => {
  test('assignee sees editable submission panel and can save draft', async ({ page }) => {
    const seeded = await seedTaskSubmissionFlow(page)
    await ensurePersonaSession(page, seeded.assigneeEmail, seeded.organizationId)
    await page.goto(`${BASE}/tasks/${seeded.taskId}`)

    await openSubmissionTab(page)
    await page.getByLabel(/Tóm tắt kết quả/i).fill('Implemented API and UI flow')
    await page.getByRole('button', { name: /Lưu nháp/i }).click()

    await expect(page.getByText(/Đã lưu bản nháp báo cáo thành công/i)).toBeVisible()
  })

  test('outsider cannot edit submission fields and sees read-only state', async ({ page }) => {
    const seeded = await seedTaskSubmissionFlow(page)
    await ensurePersonaSession(page, seeded.outsiderEmail, seeded.organizationId)
    await page.goto(`${BASE}/tasks/${seeded.taskId}`)

    await openSubmissionTab(page)
    await expect(page.getByLabel(/Tóm tắt kết quả/i)).toHaveCount(0)
    await expect(page.getByText(/Chưa có báo cáo hoàn thành nào/i)).toBeVisible()
  })

  test('assignee sees locked state after submission is locked', async ({ page }) => {
    const seeded = await seedTaskSubmissionFlow(page)
    await ensurePersonaSession(page, seeded.assigneeEmail, seeded.organizationId)
    await page.goto(`${BASE}/tasks/${seeded.taskId}`)

    await openSubmissionTab(page)
    await page.getByLabel(/Tóm tắt kết quả/i).fill('Completed work')
    await page.getByRole('button', { name: /Nộp báo cáo/i }).click()

    await expect(page.getByText(/Đã nộp báo cáo thành công/i)).toBeVisible()
    await page.getByRole('button', { name: /Khóa báo cáo/i }).click()
    await expect(page.getByText(/Đã khóa báo cáo thành công/i)).toBeVisible()
    await expect(page.getByText('Báo cáo đã khóa', { exact: true })).toBeVisible()
    await expect(page.getByLabel(/Tóm tắt kết quả/i)).toHaveCount(0)
  })

  test('invalid task ID shows graceful error not 500', async ({ page }) => {
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
