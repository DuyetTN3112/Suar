import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { test, expect, type Page } from '@playwright/test'

import { getTestingAuthState, login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/review-two-peer-quorum-demo')
const REVIEW_SURFACE_TIMEOUT_MS = 90_000

interface LifecycleSeed {
  organizationId: string
  taskId: string
  reviewSessionId: string
  skillId: string
  ownerEmail: string
  revieweeEmail: string
  peerEmail: string
  peerEmails: string[]
}

async function seedTwoPeerReview(page: Page): Promise<LifecycleSeed> {
  const response = await page.request.post(`${BASE_URL}/api/testing/seed-review-lifecycle-flow`, {
    data: {
      timestamp: Date.now(),
      nonce: Math.random().toString(36).slice(2, 8),
      peerCount: 2,
      demoNames: true,
    },
  })
  expect(response.status()).toBe(201)
  const body = (await response.json()) as { data: LifecycleSeed }
  expect(body.data.reviewSessionId).toMatch(/^[0-9a-f-]{36}$/i)
  expect(body.data.peerEmails).toHaveLength(2)
  expect(body.data.peerEmails.every((email) => email.includes('@'))).toBe(true)
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

async function loginAs(page: Page, email: string, organizationId: string) {
  await page.context().clearCookies()
  await login(page, email, { organizationId })
  const authState = await getTestingAuthState(page)
  expect(authState?.email?.toLowerCase()).toBe(email.toLowerCase())
  expect(authState?.sessionOrganizationId ?? authState?.currentOrganizationId).toBe(organizationId)
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
    .fill('Two-peer demo evidence confirms the review quorum path.')
  await page
    .locator(`[id="comment-${skillId}"]`)
    .fill('Two-peer quorum reviewer comment for live demo readiness.')
}

async function submitReview(
  page: Page,
  seedData: LifecycleSeed,
  reviewerType: 'Manager review' | 'Peer review',
  level: string
) {
  await page.goto(`${BASE_URL}/reviews/${seedData.reviewSessionId}`, { waitUntil: 'domcontentloaded' })
  const reviewButton = page.getByRole('button', { name: reviewerType })
  await expect(reviewButton).toBeVisible({ timeout: REVIEW_SURFACE_TIMEOUT_MS })
  await reviewButton.click({ timeout: REVIEW_SURFACE_TIMEOUT_MS })
  await fillSkillRating(page, seedData.skillId, level)

  if (reviewerType === 'Manager review') {
    await page.locator('#overall_quality_score').fill('5')
    await page.locator('#requirement_adherence').fill('5')
    await page.locator('#communication_quality').fill('4')
    await page.locator('#code_quality_score').fill('5')
    await page.locator('#proactiveness_score').fill('4')
    await page.locator('#strengths_observed').fill('Owner confirms task evidence is ready.')
    await page
      .locator('#areas_for_improvement')
      .fill('Worker should keep the final proof package concise.')
  }

  await page.getByRole('button', { name: 'Gửi đánh giá' }).click()
  await expect(page.getByText('Review submitted successfully')).toBeVisible()
  await waitForReviewToastToClear(page)
}

test.describe('Two-peer review quorum demo', () => {
  test.describe.configure({ timeout: 180000 })

  test('worker cannot confirm until owner and two peer reviewers submit', async ({ page }) => {
    const browserErrors: string[] = []
    page.on('pageerror', (error) => browserErrors.push(error.message))

    const seedData = await seedTwoPeerReview(page)
    const [peerOneEmail, peerTwoEmail] = seedData.peerEmails
    if (!peerOneEmail || !peerTwoEmail) {
      throw new Error('Expected two peer reviewer emails from review seed data')
    }

    await loginAs(page, seedData.ownerEmail, seedData.organizationId)
    await submitReview(page, seedData, 'Manager review', 'l10')
    await screenshot(page, '01-owner-manager-review-submitted')

    await loginAs(page, peerOneEmail, seedData.organizationId)
    await submitReview(page, seedData, 'Peer review', 'l9')
    await screenshot(page, '02-peer-one-review-submitted')

    await loginAs(page, seedData.revieweeEmail, seedData.organizationId)
    await page.goto(`${BASE_URL}/tasks/${seedData.taskId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Manager 1 · Peer 1/2')).toBeVisible()
    await expect(page.getByText('Review đã đủ dữ liệu')).not.toBeVisible()
    await screenshot(page, '03-worker-waits-for-second-peer')

    await loginAs(page, peerTwoEmail, seedData.organizationId)
    await submitReview(page, seedData, 'Peer review', 'l8')
    await screenshot(page, '04-peer-two-review-submitted')

    await loginAs(page, seedData.revieweeEmail, seedData.organizationId)
    await page.goto(`${BASE_URL}/tasks/${seedData.taskId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Review: Chờ bạn xác nhận')).toBeVisible()
    await expect(page.getByText('Manager 1 · Peer 2/2')).toBeVisible()
    await expect(page.getByText('Review đã đủ dữ liệu')).toBeVisible()
    await screenshot(page, '05-worker-can-confirm-or-dispute-after-two-peers')

    expect(browserErrors).toEqual([])
  })
})
