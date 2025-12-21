import { resolve } from 'node:path'

import { expect, test, type Locator, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/task-review-board')

async function activateButton(page: Page, button: Locator) {
  await button.focus()
  await page.keyboard.press('Enter')
}

async function captureBoardScreenshot(page: Page, path: string) {
  await page.evaluate(() => {
    const style = document.createElement('style')
    style.id = 'e2e-review-screenshot-style'
    style.textContent = 'header.sticky { position: static !important; }'
    document.head.append(style)
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    window.scrollTo(0, 0)
  })
  await page.screenshot({ path, fullPage: true })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.evaluate(() => document.getElementById('e2e-review-screenshot-style')?.remove())
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
    const {
      organizationId,
      projectId,
      ownerEmail,
      managerEmail,
      workerEmail,
      workerTaskId,
    } = seeded.data

    await login(page, ownerEmail, { organizationId })
    await page.goto(`/reviews/task-board?project_id=${projectId}&task_id=${workerTaskId}`)
    await expect(page.getByRole('heading', { name: 'Task review board' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Review task này' })).toBeVisible()
    await expect(page.getByLabel('Nhập review')).toBeVisible()
    await expect(page.locator('a[href="/reviews/reverse-reviews"]')).toHaveCount(0)
    await page.getByLabel('Nhập review').fill('Owner review: delivery context is approved.')
    await page.getByLabel('Nhập review').blur()
    await activateButton(page, page.getByRole('button', { name: /Gửi review/i }))
    await expect(page.getByText('Đã gửi review task')).toBeVisible()
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/00-owner-reviewed.png`)

    await login(page, managerEmail, { organizationId })
    await page.goto(`/reviews/task-board?project_id=${projectId}&task_id=${workerTaskId}`)
    await expect(page.getByRole('heading', { name: 'Task review board' })).toBeVisible()
    await expect(page.getByText('Đang review')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Review task này' })).toBeVisible()
    await expect(page.locator('a[href="/my-reviews"]')).toHaveCount(0)
    await expect(page.locator('a[href="/reviews/reverse-reviews"]')).toHaveCount(0)

    const taskCard = page.getByRole('button', { name: /Review checkout evidence package/i }).first()
    await expect(taskCard).toContainText(/review_worker_/)
    await expect(taskCard).toContainText(/1\/2/)
    await expect(taskCard).toContainText(/done/i)
    await expect(page.getByRole('heading', { name: 'Reviewers' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Review thread' })).toBeVisible()
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/01-manager-awaiting-review.png`)

    await page.getByLabel('Nhập review').fill('Manager review: evidence looks complete.')
    await page.getByLabel('Nhập review').blur()
    await activateButton(page, page.getByRole('button', { name: /Gửi review/i }))
    await expect(page.getByText('Đã gửi review task')).toBeVisible()
    await expect(page.getByText('awaiting_response')).toBeVisible()
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/02-manager-awaiting-response.png`)

    await login(page, workerEmail, { organizationId })
    await page.goto(`/reviews/task-board?project_id=${projectId}&task_id=${workerTaskId}`)
    await expect(page.getByRole('button', { name: /Đồng ý review/i })).toBeVisible()
    await activateButton(page, page.getByRole('button', { name: /Đồng ý review/i }))
    await expect(page.getByText('Đã đồng ý review, task chuyển Done')).toBeVisible()
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
    const {
      organizationId,
      projectId,
      ownerEmail,
      managerEmail,
      workerEmail,
      workerTaskId,
    } = seeded.data

    await login(page, ownerEmail, { organizationId })
    await page.goto(`/reviews/task-board?project_id=${projectId}&task_id=${workerTaskId}`)
    await expect(page.getByRole('heading', { name: 'Task review board' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Review task này' })).toBeVisible()
    await page.getByLabel('Nhập review').fill('Owner review: evidence is acceptable.')
    await page.getByLabel('Nhập review').blur()
    await activateButton(page, page.getByRole('button', { name: /Gửi review/i }))
    await expect(page.getByText('Đã gửi review task')).toBeVisible()

    await login(page, managerEmail, { organizationId })
    await page.goto(`/reviews/task-board?project_id=${projectId}&task_id=${workerTaskId}`)
    await expect(page.getByRole('heading', { name: 'Review task này' })).toBeVisible()
    await page.getByLabel('Nhập review').fill('Manager review: evidence needs clarification.')
    await page.getByLabel('Nhập review').blur()
    await activateButton(page, page.getByRole('button', { name: /Gửi review/i }))
    await expect(page.getByText('Đã gửi review task')).toBeVisible()

    await login(page, workerEmail, { organizationId })
    await page.goto(`/reviews/task-board?project_id=${projectId}&task_id=${workerTaskId}`)
    await expect(page.getByRole('button', { name: /Đồng ý review/i })).toBeVisible()
    await page
      .getByLabel('Phản hồi/tranh luận')
      .fill('Worker response: reviewer missed checkout proof.')
    await page.getByLabel('Phản hồi/tranh luận').blur()
    await activateButton(page, page.getByRole('button', { name: 'Gửi phản hồi' }))
    await expect(page.getByText('2/2 · disputed')).toBeVisible()
    await expect(page.getByLabel('Gửi report tranh chấp')).toBeVisible()

    await page.getByLabel('Gửi report tranh chấp').fill(reportReason)
    await page.getByLabel('Gửi report tranh chấp').blur()
    await activateButton(page, page.getByRole('button', { name: 'Gửi report' }))
    await expect(page.getByText('2/2 · reported')).toBeVisible()

    await login(page, adminEmail, { systemRole: 'superadmin' })
    await page.goto('/admin/disputes')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Dispute queue' })).toBeVisible()

    const reportedCase = page.getByRole('article').filter({ hasText: reportReason }).first()
    await expect(reportedCase).toBeVisible()
    await expect(reportedCase.getByText('Task workflow')).toBeVisible()
    await expect(reportedCase.getByText('AI 1 runs')).toBeVisible()
    await expect(reportedCase.getByRole('link', { name: 'Open decision room' })).toBeVisible()
  })
})
