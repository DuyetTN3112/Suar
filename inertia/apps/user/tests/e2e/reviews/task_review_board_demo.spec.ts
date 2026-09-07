import { resolve } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/task-review-board')

async function submitVisibleReview(page: Page) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/task-reviews/tasks/') &&
      response.url().endsWith('/reviews') &&
      response.request().method() === 'POST'
  )
  await page.getByRole('button', { name: /Gửi review|Send review/i }).click()
  const response = await responsePromise
  expect(response.status()).toBeLessThan(400)
}

async function captureBoardScreenshot(page: Page, path: string) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined)
  await page.evaluate(() => {
    const style = document.createElement('style')
    style.id = 'e2e-review-screenshot-style'
    style.textContent = 'header.sticky { position: static !important; }'
    document.head.append(style)
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    window.scrollTo(0, 0)
  })
  await page.screenshot({ path, fullPage: true })
  await page.waitForLoadState('domcontentloaded').catch(() => undefined)
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => undefined)
  await page.evaluate(() => document.getElementById('e2e-review-screenshot-style')?.remove()).catch(() => undefined)
}

interface SeedResponse {
  data: {
    organizationId: string
    projectId: string
    ownerEmail: string
    workerEmail: string
    managerEmail: string
    peerEmail: string
    workerTaskId: string
  }
}

test.describe('Task review board demo flow', () => {
  test('owner, manager, and worker can complete task review board flow', async ({ page }) => {
    const seed = await page.request.post(`${BASE}/api/testing/seed-task-review-board-flow`, {
      data: {
        timestamp: Date.now(),
        nonce: 'task-review-board',
      },
    })
    expect(seed.status()).toBe(201)
    const seeded = (await seed.json()) as SeedResponse
    const { organizationId, projectId, ownerEmail, managerEmail, workerEmail, workerTaskId } =
      seeded.data

    await login(page, ownerEmail, { organizationId })
    await page.goto(`/projects/${projectId}/reviews/tasks?task_id=${workerTaskId}`)
    await expect(page.getByRole('heading', { name: 'Task review board' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Review task này|Review this task/i })
    ).toBeVisible()
    await expect(page.getByLabel(/Nhập review|Enter review/i)).toBeVisible()
    await expect(page.locator('a[href="/reviews/reverse-reviews"]')).toHaveCount(0)
    await page
      .getByLabel(/Nhập review|Enter review/i)
      .fill('Owner review: delivery context is approved.')
    await page.getByLabel(/Nhập review|Enter review/i).blur()
    await submitVisibleReview(page)
    await expect(page.getByText('Đã gửi review task').first()).toBeVisible()
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/00-owner-reviewed.png`)

    await login(page, managerEmail, { organizationId })
    await page.goto(`/projects/${projectId}/reviews/tasks?task_id=${workerTaskId}`)
    await expect(page.getByRole('heading', { name: 'Task review board' })).toBeVisible()
    await expect(page.getByText('Đang review')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Review task này|Review this task/i })
    ).toBeVisible()
    await expect(page.locator('a[href="/my-reviews"]')).toHaveCount(0)
    await expect(page.locator('a[href="/reviews/reverse-reviews"]')).toHaveCount(0)

    const taskCard = page.getByRole('button', { name: /Review checkout evidence package/i }).first()
    await expect(taskCard).toContainText(/review_worker_/)
    await expect(taskCard).toContainText(/1\/2/)
    await expect(taskCard).toContainText(/done/i)
    await expect(page.getByRole('heading', { name: /Reviewers|Người đánh giá/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Review thread|Luồng review/i })).toBeVisible()
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/01-manager-awaiting-review.png`)

    await page
      .getByLabel(/Nhập review|Enter review/i)
      .fill('Manager review: evidence looks complete.')
    await page.getByLabel(/Nhập review|Enter review/i).blur()
    await submitVisibleReview(page)
    await expect(page.getByText('Đã gửi review task').first()).toBeVisible()
    await expect(page.getByText('awaiting_response')).toBeVisible()
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/02-manager-awaiting-response.png`)

    await login(page, workerEmail, { organizationId })
    await page.goto(`/projects/${projectId}/reviews/tasks?task_id=${workerTaskId}`)
    await expect(page.getByRole('button', { name: /Đồng ý review|Accept review/i })).toBeVisible()
    await page.getByRole('button', { name: /Đồng ý review|Accept review/i }).click()
    await expect(page.getByText('2/2 · done').first()).toBeVisible()
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/03-worker-done.png`)
  })

  test('worker report sends task review dispute to admin queue with AI evaluation', async ({
    page,
  }) => {
    const timestamp = Date.now()
    const adminEmail = `seed-review-system-admin-${timestamp}@test.com`
    const reportReason = `E2E task review admin escalation ${timestamp}`

    await login(page, adminEmail, { systemRole: 'superadmin' })

    const seed = await page.request.post(`${BASE}/api/testing/seed-task-review-board-flow`, {
      data: {
        timestamp,
        nonce: 'task-review-report',
      },
    })
    expect(seed.status()).toBe(201)
    const seeded = (await seed.json()) as SeedResponse
    const { organizationId, projectId, ownerEmail, managerEmail, workerEmail, workerTaskId } =
      seeded.data

    await login(page, ownerEmail, { organizationId })
    await page.goto(`/projects/${projectId}/reviews/tasks?task_id=${workerTaskId}`)
    await expect(page.getByRole('heading', { name: 'Task review board' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Review task này|Review this task/i })
    ).toBeVisible()
    await page
      .getByLabel(/Nhập review|Enter review/i)
      .fill('Owner review: evidence is acceptable.')
    await page.getByLabel(/Nhập review|Enter review/i).blur()
    await submitVisibleReview(page)
    await expect(page.getByText('Đã gửi review task').first()).toBeVisible()

    await login(page, managerEmail, { organizationId })
    await page.goto(`/projects/${projectId}/reviews/tasks?task_id=${workerTaskId}`)
    await expect(
      page.getByRole('heading', { name: /Review task này|Review this task/i })
    ).toBeVisible()
    await page
      .getByLabel(/Nhập review|Enter review/i)
      .fill('Manager review: evidence needs clarification.')
    await page.getByLabel(/Nhập review|Enter review/i).blur()
    await submitVisibleReview(page)
    await expect(page.getByText('Đã gửi review task').first()).toBeVisible()

    await login(page, workerEmail, { organizationId })
    await page.goto(`/projects/${projectId}/reviews/tasks?task_id=${workerTaskId}`)
    await expect(page.getByRole('button', { name: /Đồng ý review|Accept review/i })).toBeVisible()
    await page
      .getByLabel(/Phản hồi\/tranh luận|Response \/ discussion/i)
      .fill('Worker response: reviewer missed checkout proof.')
    await page.getByLabel(/Phản hồi\/tranh luận|Response \/ discussion/i).blur()
    await page.getByRole('button', { name: /Gửi phản hồi|Send response/i }).click()
    await expect(page.getByText('2/2 · disputed')).toBeVisible()
    await expect(page.getByLabel(/Gửi report tranh chấp|Send dispute report/i)).toBeVisible()

    await page.getByLabel(/Gửi report tranh chấp|Send dispute report/i).fill(reportReason)
    await page.getByLabel(/Gửi report tranh chấp|Send dispute report/i).blur()
    await page.getByRole('button', { name: /Gửi report|Send report/i }).click()
    await expect(page.getByText('2/2 · reported')).toBeVisible()

    await login(page, adminEmail, { systemRole: 'superadmin' })
    await page.goto('/admin/disputes')
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: /Dispute queue|AI dispute progress board/i })
    ).toBeVisible()

    const reportedCase = page.getByRole('link').filter({ hasText: reportReason }).first()
    await expect(reportedCase).toBeVisible()
    await expect(reportedCase).toContainText('request_admin_review')
    await reportedCase.click()
    await expect(page).toHaveURL(/\/admin\/disputes\/[0-9a-f-]+$/i)
    await expect(page.getByText(reportReason, { exact: false }).first()).toBeVisible()
    await expect(page.getByText(/AI/i).first()).toBeVisible()
  })
})
