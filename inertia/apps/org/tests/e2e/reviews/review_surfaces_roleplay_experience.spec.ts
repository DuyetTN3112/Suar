import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { test, expect, type Page } from '@playwright/test'

import { getTestingAuthState, login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/review-surfaces-roleplay')
const REVIEW_SURFACE_TIMEOUT_MS = 90_000

interface LifecycleSeed {
  organizationId: string
  projectId: string
  taskId: string
  reviewSessionId: string
  skillId: string
  ownerEmail: string
  revieweeEmail: string
  peerEmail: string
}

interface AdminSeed {
  organizationId: string
  disputeId: string
  adminEmail: string
}

async function seed<T>(page: Page, path: string): Promise<T> {
  const response = await page.request.post(`${BASE_URL}${path}`, {
    data: {
      timestamp: Date.now(),
      nonce: Math.random().toString(36).slice(2, 8),
      demoNames: true,
    },
  })
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as { data: T }
  return body.data
}

async function screenshot(page: Page, name: string) {
  const path = resolve(SCREENSHOT_DIR, `${name}.png`)
  mkdirSync(dirname(path), { recursive: true })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.evaluate(
    () =>
      new Promise<void>((resolvePaint) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolvePaint()))
      })
  )
  await screenshotMainViewport(page, path)
}

async function screenshotSection(page: Page, selector: string, name: string) {
  const path = resolve(SCREENSHOT_DIR, `${name}.png`)
  mkdirSync(dirname(path), { recursive: true })
  const surface = page.locator(selector).first()
  await surface.scrollIntoViewIfNeeded()
  await page.evaluate(
    () =>
      new Promise<void>((resolvePaint) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolvePaint()))
      })
  )
  await surface.screenshot({ path })
}

async function screenshotMainViewport(page: Page, path: string) {
  const main = await page.$('main')
  const box = await main?.boundingBox()
  const viewport = page.viewportSize()
  if (!box || !viewport) {
    await page.screenshot({ path, fullPage: false })
    return
  }
  await page.screenshot({
    path,
    clip: {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.min(box.width, viewport.width - Math.max(0, box.x)),
      height: Math.min(box.height, viewport.height - Math.max(0, box.y)),
    },
  })
}

async function waitForReviewToastToClear(page: Page) {
  await page.getByText('Review submitted successfully').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined)
}

async function loginAs(
  page: Page,
  email: string,
  options: { organizationId: string; systemRole?: string }
) {
  await page.context().clearCookies()
  await login(page, email, options)
  const authState = await getTestingAuthState(page)
  expect(authState?.email?.toLowerCase()).toBe(email.toLowerCase())
  expect(authState?.sessionOrganizationId ?? authState?.currentOrganizationId).toBe(options.organizationId)

  if (options.systemRole) {
    expect(authState?.systemRole).toBe(options.systemRole)
  }
}

async function gotoReviewSurface(page: Page, url: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      return
    } catch (error) {
      if (attempt === 1 || !String(error).includes('ERR_ABORTED')) {
        throw error
      }
      await page.waitForLoadState('domcontentloaded', { timeout: 1000 }).catch(() => undefined)
    }
  }
}

async function chooseSkillLevel(page: Page, level = 'l10') {
  await page.locator('button').filter({ hasText: 'Chọn mức độ...' }).first().click()
  await page.locator(`div[data-value="${level}"]:visible`).first().click()
}

async function fillSkillRating(page: Page, skillId: string, level = 'l10') {
  await expect(page.getByText(/Evidence Quality|Seed Review Skill/)).toBeVisible()
  await chooseSkillLevel(page, level)
  await page.locator(`[id="confidence-${skillId}"]`).selectOption('high')
  await page
    .locator(`[id="rationale-${skillId}"]`)
    .fill('Roleplay evidence shows the task moved cleanly into review zone.')
  await page
    .locator(`[id="comment-${skillId}"]`)
    .fill('Roleplay reviewer comment for seeded task governance audit.')
}

async function submitManagerReview(page: Page, seedData: LifecycleSeed) {
  await gotoReviewSurface(page, `${BASE_URL}/reviews/${seedData.reviewSessionId}`)
  const managerReviewButton = page.getByRole('button', { name: 'Manager review' })
  await expect(managerReviewButton).toBeVisible({ timeout: REVIEW_SURFACE_TIMEOUT_MS })
  await managerReviewButton.click()
  await fillSkillRating(page, seedData.skillId, 'l10')
  await page.locator('#overall_quality_score').fill('5')
  await page.locator('#requirement_adherence').fill('5')
  await page.locator('#communication_quality').fill('4')
  await page.locator('#code_quality_score').fill('5')
  await page.locator('#proactiveness_score').fill('4')
  await page.locator('#strengths_observed').fill('Boss saw strong task ownership and evidence discipline.')
  await page.locator('#areas_for_improvement').fill('Need clearer final context before scoring locks.')
  await page.getByRole('button', { name: 'Gửi đánh giá' }).click()
  await expect(page.getByText('Review submitted successfully')).toBeVisible()
  await waitForReviewToastToClear(page)
}

async function submitPeerReview(page: Page, seedData: LifecycleSeed) {
  await gotoReviewSurface(page, `${BASE_URL}/reviews/${seedData.reviewSessionId}`)
  const peerReviewButton = page.getByRole('button', { name: 'Peer review' })
  await expect(peerReviewButton).toBeVisible({ timeout: REVIEW_SURFACE_TIMEOUT_MS })
  await peerReviewButton.click()
  await fillSkillRating(page, seedData.skillId, 'l9')
  await page.getByRole('button', { name: 'Gửi đánh giá' }).click()
  await expect(page.getByText('Review submitted successfully')).toBeVisible()
  await waitForReviewToastToClear(page)
}

test.describe('Review governance surface roleplay', () => {
  test.describe.configure({ timeout: 180000 })

  test('boss, worker, peer, org, and admin surfaces expose the review lifecycle', async ({
    page,
  }) => {
    const browserErrors: string[] = []
    page.on('pageerror', (error) => browserErrors.push(error.message))

    const seedData = await seed<LifecycleSeed>(page, '/api/testing/seed-review-lifecycle-flow')

    await loginAs(page, seedData.ownerEmail, { organizationId: seedData.organizationId })
    await gotoReviewSurface(page, `${BASE_URL}/tasks/${seedData.taskId}`)
    await expect(page.getByText('Review Zone')).toBeVisible()
    await expect(page.getByText('Checkpoint bắt buộc')).toBeVisible()
    await screenshot(page, '01-boss-task-review-zone')

    await gotoReviewSurface(page, `${BASE_URL}/org/reviews/task-board?project_id=${seedData.projectId}`)
    await expect(page.getByRole('heading', { name: 'Task review board' })).toBeVisible()
    await screenshot(page, '02-boss-task-review-board')

    await loginAs(page, seedData.revieweeEmail, { organizationId: seedData.organizationId })
    await gotoReviewSurface(page, `${BASE_URL}/tasks/${seedData.taskId}`)
    await expect(page.getByText('Review Zone')).toBeVisible()
    await expect(page.getByText('Đi tới review session')).toBeVisible()
    await screenshot(page, '03-worker-task-review-zone')

    await gotoReviewSurface(page, `${BASE_URL}/reviews/${seedData.reviewSessionId}`)
    const workerReviewTaskDetail = page.locator('[data-demo-section="review-task-detail"]')
    await expect(workerReviewTaskDetail.getByText('Task cần review')).toBeVisible({
      timeout: REVIEW_SURFACE_TIMEOUT_MS,
    })
    await expect(
      workerReviewTaskDetail.getByRole('heading', { name: 'Checkout QA evidence package' })
    ).toBeVisible({ timeout: REVIEW_SURFACE_TIMEOUT_MS })
    await screenshot(page, '04-worker-review-session-in-progress')

    await loginAs(page, seedData.ownerEmail, { organizationId: seedData.organizationId })
    await submitManagerReview(page, seedData)
    await screenshot(page, '05-boss-manager-review-submitted')

    await loginAs(page, seedData.peerEmail, { organizationId: seedData.organizationId })
    await gotoReviewSurface(page, `${BASE_URL}/org/reviews/task-board?project_id=${seedData.projectId}`)
    await expect(page.getByRole('heading', { name: 'Task review board' })).toBeVisible()
    await screenshot(page, '06-peer-task-review-board')
    await submitPeerReview(page, seedData)
    await screenshot(page, '07-peer-review-submitted')

    await loginAs(page, seedData.revieweeEmail, { organizationId: seedData.organizationId })
    await gotoReviewSurface(page, `${BASE_URL}/tasks/${seedData.taskId}`)
    await expect(page.getByText('Review: Chờ bạn xác nhận')).toBeVisible()
    await expect(page.getByText('Review đã đủ dữ liệu')).toBeVisible()
    await screenshot(page, '08-worker-task-ready-to-confirm-or-dispute')

    await loginAs(page, seedData.revieweeEmail, { organizationId: seedData.organizationId })
    await gotoReviewSurface(page, `${BASE_URL}/reviews/${seedData.reviewSessionId}`)
    await page.getByRole('tab', { name: 'Xác nhận' }).click()
    const confirmationPanel = page.locator('[data-demo-section="review-confirmation-panel"]')
    await expect(confirmationPanel.getByRole('heading', { name: 'Xác nhận kết quả' })).toBeVisible()
    await expect(confirmationPanel.getByText('1/1')).toBeVisible()
    await screenshot(page, '09-worker-review-session-awaiting-confirmation')

    await gotoReviewSurface(page, `${BASE_URL}/reviews/${seedData.reviewSessionId}`)
    await page.getByRole('tab', { name: 'Xác nhận' }).click()
    await page.getByRole('button', { name: /Tranh chấp/ }).click()
    await page
      .locator('#dispute-reason')
      .fill('Worker disputes the lifecycle result after comparing boss and peer context.')
    await page.locator('#dispute-reason').scrollIntoViewIfNeeded()
    await screenshotSection(page, '[data-demo-section="review-confirmation-panel"]', '10-worker-dispute-form')
    await page.getByRole('button', { name: 'Gửi tranh chấp' }).click()
    await expect(page.getByText('Đánh giá này đang bị khiếu nại.')).toBeVisible()
    await expect(page.getByText('Task cần review')).toBeVisible()
    await screenshotSection(page, '[data-demo-section="review-task-detail"]', '11-worker-review-disputed')

    await gotoReviewSurface(page, `${BASE_URL}/tasks/${seedData.taskId}`)
    await expect(page.getByText('Dispute: Đang trao đổi')).toBeVisible()
    await expect(page.getByText('Đi tới tranh chấp')).toBeVisible()
    await screenshot(page, '12-worker-task-dispute-state')

    await loginAs(page, seedData.ownerEmail, { organizationId: seedData.organizationId })
    await gotoReviewSurface(page, `${BASE_URL}/org/disputes`)
    await expect(page.getByRole('heading', { name: 'Hàng đợi khiếu nại đánh giá' })).toBeVisible()
    await expect(page.getByText('Worker disputes the lifecycle result')).toBeVisible()
    await screenshot(page, '13-org-dispute-queue')

    const disputeLink = page.getByRole('link', { name: /Mở hồ sơ|Xem chi tiết/ }).first()
    const disputeHref = await disputeLink.getAttribute('href')
    if (!disputeHref) {
      throw new Error('Missing org dispute detail link')
    }
    await disputeLink.click()
    await page.waitForLoadState('domcontentloaded').catch(() => undefined)
    await expect(page.getByText('Tranh chấp review')).toBeVisible()
    await page.getByRole('tab', { name: 'Giải trình' }).click()
    await expect(page.getByRole('heading', { name: 'Giải trình của tổ chức' })).toBeVisible()
    await page.getByRole('button', { name: 'Mở', exact: true }).click()
    await expect(page.getByText('Đại diện tổ chức phản hồi chính thức')).toBeVisible()
    await page
      .locator('#org-summary')
      .fill('Organization response: reviewer context is valid but needs clearer evidence trail.')
    await page.getByRole('button', { name: 'Gửi giải trình' }).click()
    await expect(page.getByText('Đã gửi phản hồi giải trình của Tổ chức thành công.')).toBeVisible()
    await screenshot(page, '14-org-dispute-detail-response-tab')

    const adminSeed = await seed<AdminSeed>(page, '/api/testing/seed-sprint-review-governance-flow')
    await loginAs(page, adminSeed.adminEmail, {
      organizationId: adminSeed.organizationId,
      systemRole: 'superadmin',
    })
    await gotoReviewSurface(page, `${BASE_URL}/admin/disputes/${adminSeed.disputeId}`)
    await expect(page.getByRole('tab', { name: 'Xử lý' })).toBeVisible()
    await page.getByRole('tab', { name: 'Xử lý' }).click()
    await expect(page.getByText('Dossier chưa đủ dữ liệu bắt buộc')).toBeVisible()
    await screenshotSection(page, '[data-demo-section="admin-dispute-resolution-form"]', '15-admin-dispute-readiness-gate')

    expect(browserErrors).toEqual([])
  })
})
