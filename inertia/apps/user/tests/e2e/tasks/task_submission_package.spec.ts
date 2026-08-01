import { test, expect } from '@playwright/test'

import { ensurePersonaSession } from '../../shared/e2e/fixtures/auth_personas.js'
import {
  seedTaskSubmissionFlow,
  type SeededTaskSubmissionContext,
} from '../../shared/e2e/support/seeded_task_submission.js'

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

async function openSubmissionTab(page: import('@playwright/test').Page) {
  const tab = page.getByRole('tab', { name: /Submission|Nộp bài/i })
  if ((await tab.count()) > 0) {
    await tab.click()
  }
  await expect(
    page.getByRole('heading', {
      name: /Báo cáo hoàn thành công việc|Task completion report/i,
    })
  ).toBeVisible()
}

async function openFilesTab(page: import('@playwright/test').Page) {
  const tab = page.getByRole('tab', { name: /Files|Tệp/i })
  if ((await tab.count()) > 0) {
    await tab.click()
  }
  await expect(page.getByRole('heading', { name: /Attachments|Tệp đính kèm/i })).toBeVisible()
}

async function openTaskDrawer(
  page: import('@playwright/test').Page,
  seeded: SeededTaskSubmissionContext
) {
  await page.goto(`${BASE}/projects/${seeded.projectId}/tasks`)
  await page.waitForLoadState('domcontentloaded')
  await page.getByRole('button', { name: new RegExp(seeded.taskTitle) }).click()
  await expect(page.locator('[data-testid="task-drawer-work-surfaces"]')).toBeVisible()
}

test.describe('Task Submission Package E2E', () => {
  test('assignee sees editable submission panel and can save draft', async ({ page }) => {
    const seeded = await seedTaskSubmissionFlow(page)
    await ensurePersonaSession(page, seeded.assigneeEmail, seeded.organizationId)
    await openTaskDrawer(page, seeded)

    await openSubmissionTab(page)
    await page.getByLabel(/Tóm tắt kết quả|Result summary/i).fill('Implemented API and UI flow')
    await page.getByRole('button', { name: /Lưu nháp|Save draft/i }).click()

    await expect(
      page.getByText(/Đã lưu bản nháp báo cáo thành công|Report draft saved successfully/i)
    ).toBeVisible()
  })

  test('outsider cannot see the assigned task or edit its submission from the project board', async ({
    page,
  }) => {
    const seeded = await seedTaskSubmissionFlow(page)
    await ensurePersonaSession(page, seeded.outsiderEmail, seeded.organizationId)
    await page.goto(`${BASE}/projects/${seeded.projectId}/tasks`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('button', { name: new RegExp(seeded.taskTitle) })).toHaveCount(0)
    await expect(page.locator('[data-testid="task-drawer-work-surfaces"]')).toHaveCount(0)
    await expect(page.getByLabel(/Tóm tắt kết quả|Result summary/i)).toHaveCount(0)
  })

  test('assignee sees locked state after submission is locked', async ({ page }) => {
    const seeded = await seedTaskSubmissionFlow(page)
    await ensurePersonaSession(page, seeded.assigneeEmail, seeded.organizationId)
    await openTaskDrawer(page, seeded)

    await openSubmissionTab(page)
    await page.getByLabel(/Tóm tắt kết quả|Result summary/i).fill('Completed work')
    await page.getByRole('button', { name: /Nộp báo cáo|Submit (report|package)/i }).click()

    await expect(
      page.getByText(/Đã nộp báo cáo thành công|Report submitted successfully/i)
    ).toBeVisible()
    await page.getByRole('button', { name: /Khóa báo cáo|Lock report/i }).click()
    await expect(
      page.getByText(/Đã khóa báo cáo thành công|Report locked successfully/i)
    ).toBeVisible()
    await expect(page.getByText(/^(Báo cáo đã khóa|Report locked)$/i)).toBeVisible()
    await expect(page.getByLabel(/Tóm tắt kết quả|Result summary/i)).toHaveCount(0)
  })

  test('assignee can open a task from /work and submit a report in-shell', async ({ page }) => {
    const seeded = await seedTaskSubmissionFlow(page)
    await ensurePersonaSession(page, seeded.assigneeEmail, seeded.organizationId)

    await page.goto(`${BASE}/work`)
    await expect(page.getByRole('heading', { name: /My work|Công việc của tôi/i })).toBeVisible()

    const expectedTaskHref = `/projects/${seeded.projectId}/tasks?task_id=${seeded.taskId}`
    const taskLink = page.getByRole('link', { name: seeded.taskTitle, exact: true })
    await expect(taskLink).toBeVisible()
    const taskHref = await taskLink.getAttribute('href')
    expect(taskHref).toBe(expectedTaskHref)
    await page.goto(new URL(taskHref ?? '', BASE).toString())
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('[data-testid="task-drawer-work-surfaces"]')).toBeVisible()

    await openFilesTab(page)
    await page.locator('#attachment-file').evaluate((element) => {
      const input = element as HTMLInputElement
      const file = new File(['work shell file evidence'], 'work-shell-evidence.txt', {
        type: 'text/plain',
      })
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      input.files = dataTransfer.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await expect(page.getByText(/work-shell-evidence\.txt/i)).toBeVisible()
    await page.getByLabel(/File name|Tên tệp/i).fill('work-shell-evidence.txt')
    await page.getByLabel(/Path \/ URL/i).fill('https://example.com/work-shell-evidence.txt')
    const addFileButton = page.getByRole('button', { name: /Add file|Thêm tệp/i })
    await expect(addFileButton).toBeEnabled()
    await addFileButton.click()

    const uploadedFileLink = page.getByRole('link', { name: 'work-shell-evidence.txt' })
    await expect(uploadedFileLink).toBeVisible()
    const uploadedHref = await uploadedFileLink.getAttribute('href')
    expect(uploadedHref).toContain('/uploads/tasks/')
    const uploadedResponse = await page.request.get(
      new URL(uploadedHref ?? '', page.url()).toString()
    )
    expect(uploadedResponse.ok()).toBeTruthy()

    await openSubmissionTab(page)

    await page
      .getByLabel(/Tóm tắt kết quả|Result summary/i)
      .fill('Implemented the work-shell submission flow')
    await page
      .getByLabel(/Ghi chú triển khai|Implementation notes/i)
      .fill('Opened from /work and stayed in shell.')
    await page
      .getByLabel(/Hạn chế đã biết|Known limitations/i)
      .fill('Attached file via the Files tab before submission.')
    await page.getByLabel(/Ghi chú kiểm thử|Test notes/i).fill('Playwright shell path verified.')
    await page.getByLabel(/Repository URL/i).fill('https://github.com/example/work-shell')

    await page.getByRole('button', { name: /Add evidence|Thêm bằng chứng/i }).click()
    await page.getByLabel(/Evidence type|Loại bằng chứng/i).selectOption('document_link')
    await page
      .getByLabel(/Evidence URL|URL bằng chứng/i)
      .fill('https://example.com/work-shell-evidence')
    await page.getByLabel(/Title|Tiêu đề/i).fill('Work shell evidence')
    await page
      .getByLabel(/Description|Mô tả/i)
      .fill('Task opened from /work and submitted in-shell.')
    await page.getByRole('button', { name: /Add evidence|Xác nhận thêm/i }).click()

    await page.getByRole('button', { name: /Nộp báo cáo|Submit package/i }).click()

    await expect(
      page.getByText(/Đã nộp báo cáo thành công|Report submitted successfully/i)
    ).toBeVisible()
    await expect(page.getByText(/^(Report submitted|Báo cáo đã nộp)$/i)).toBeVisible()
    await expect(page.getByText('Work shell evidence')).toBeVisible()
  })

  test('assignee can open the board drawer, upload a file, and submit without leaving the project task board', async ({
    page,
  }) => {
    const seeded = await seedTaskSubmissionFlow(page)
    await ensurePersonaSession(page, seeded.assigneeEmail, seeded.organizationId)

    await openTaskDrawer(page, seeded)
    await expect(page).toHaveURL(new RegExp(`/projects/${seeded.projectId}/tasks(?:\\?.*)?$`))

    await page
      .getByLabel(/Tóm tắt kết quả|Result summary/i)
      .fill('Implemented the work-board drawer flow')
    await page
      .getByLabel(/Ghi chú triển khai|Implementation notes/i)
      .fill('Opened from the board drawer and stayed in /tasks.')
    await page
      .getByLabel(/Hạn chế đã biết|Known limitations/i)
      .fill('Submitted from the drawer with a real uploaded file.')
    await page
      .getByLabel(/Ghi chú kiểm thử|Test notes/i)
      .fill('Drawer path verified by Playwright.')
    await page.getByLabel(/Repository URL/i).fill('https://github.com/example/task-drawer')

    await page.locator('#attachment-file').evaluate((element) => {
      const input = element as HTMLInputElement
      const file = new File(['work drawer file evidence'], 'work-drawer-evidence.txt', {
        type: 'text/plain',
      })
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      input.files = dataTransfer.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await expect(page.getByText(/work-drawer-evidence\.txt/i)).toBeVisible()
    await page.getByLabel(/File name|Tên tệp/i).fill('work-drawer-evidence.txt')
    await page.getByLabel(/Path \/ URL/i).fill('https://example.com/work-drawer-evidence.txt')
    const addFileButton = page.getByRole('button', { name: /Add file|Thêm tệp/i })
    await expect(addFileButton).toBeEnabled()
    await addFileButton.click()

    const uploadedFileLink = page.getByRole('link', { name: 'work-drawer-evidence.txt' })
    await expect(uploadedFileLink).toBeVisible()
    const uploadedHref = await uploadedFileLink.getAttribute('href')
    expect(uploadedHref).toContain('/uploads/tasks/')
    const uploadedResponse = await page.request.get(
      new URL(uploadedHref ?? '', page.url()).toString()
    )
    expect(uploadedResponse.ok()).toBeTruthy()
    await expect(page).toHaveURL(new RegExp(`/projects/${seeded.projectId}/tasks(?:\\?.*)?$`))

    await page.getByRole('button', { name: /Nộp báo cáo|Submit package/i }).click()

    await expect(
      page.getByText(/Đã nộp báo cáo thành công|Report submitted successfully/i)
    ).toBeVisible()
    await expect(page.getByText('work-drawer-evidence.txt')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/projects/${seeded.projectId}/tasks(?:\\?.*)?$`))
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
