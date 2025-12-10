import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { test, expect, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/review-dispute-exchange')

interface LifecycleSeed {
  organizationId: string
  reviewSessionId: string
  skillId: string
  ownerEmail: string
  revieweeEmail: string
  peerEmail: string
}

interface DisputeSeed {
  organizationId: string
  disputeId: string
  taskId: string
  ownerEmail: string
  revieweeEmail: string
}

async function seed<T>(page: Page, path: string, extraData: Record<string, unknown> = {}): Promise<T> {
  const response = await page.request.post(`${BASE_URL}${path}`, {
    data: {
      timestamp: Date.now(),
      nonce: Math.random().toString(36).slice(2, 8),
      ...extraData,
    },
  })
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as { data: T }
  return body.data
}

async function screenshotMain(page: Page, name: string) {
  const path = resolve(SCREENSHOT_DIR, `${name}.png`)
  mkdirSync(dirname(path), { recursive: true })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.evaluate(
    () =>
      new Promise<void>((resolvePaint) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolvePaint()))
      })
  )
  const main = page.locator('main').first()
  if ((await main.count()) > 0) {
    await main.screenshot({ path })
    return
  }
  await page.screenshot({ path, fullPage: false })
}

async function chooseSkillLevel(page: Page, level = 'l10') {
  await page.locator('button').filter({ hasText: 'Chọn mức độ...' }).first().click()
  await page.locator(`div[data-value="${level}"]:visible`).first().click()
}

async function fillSkillRating(page: Page, skillId: string, level = 'l10') {
  await expect(page.getByText(/Seed Review Skill|Seed Dispute Skill/)).toBeVisible()
  await chooseSkillLevel(page, level)
  await page.locator(`[id="confidence-${skillId}"]`).selectOption('high')
  await page
    .locator(`[id="rationale-${skillId}"]`)
    .fill('Evidence shows stable delivery and clear ownership.')
  await page
    .locator(`[id="comment-${skillId}"]`)
    .fill('Observed strong execution on the seeded review task.')
}

test.describe('Review lifecycle role experience', () => {
  test('reviewee adds context, manager and peer submit, reviewee disputes completed review', async ({
    page,
  }) => {
    const browserErrors: string[] = []
    page.on('pageerror', (error) => browserErrors.push(error.message))

    const seedData = await seed<LifecycleSeed>(page, '/api/testing/seed-review-lifecycle-flow')

    await login(page, seedData.revieweeEmail, { organizationId: seedData.organizationId })
    await page.goto(`${BASE_URL}/reviews/${seedData.reviewSessionId}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('tab', { name: 'Evidence' }).click()
    await page.locator('#evidence_title').fill('Lifecycle PR evidence')
    await page.locator('#evidence_url').fill('https://example.com/review-lifecycle-pr')
    await page.locator('#evidence_description').fill('PR evidence attached before reviewers submit.')
    await page.getByRole('button', { name: 'Lưu evidence' }).click()
    await expect(page.getByText('Lifecycle PR evidence')).toBeVisible()

    await page.getByRole('tab', { name: 'Tự đánh giá' }).click()
    await page.locator('#overall_satisfaction').fill('5')
    await page.locator('#confidence_level').fill('4')
    await page.locator('#what_went_well').fill('Scope, communication and evidence were clear.')
    await page.getByRole('button', { name: 'Lưu tự đánh giá' }).click()
    await expect(page.getByText('Bản tự đánh giá hiện tại')).toBeVisible()

    await login(page, seedData.ownerEmail, { organizationId: seedData.organizationId })
    await page.goto(`${BASE_URL}/reviews/${seedData.reviewSessionId}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Manager review' }).click()
    await fillSkillRating(page, seedData.skillId, 'l10')
    await page.locator('#overall_quality_score').fill('5')
    await page.locator('#requirement_adherence').fill('5')
    await page.locator('#communication_quality').fill('4')
    await page.locator('#code_quality_score').fill('5')
    await page.locator('#proactiveness_score').fill('4')
    await page.locator('#strengths_observed').fill('Strong ownership and evidence discipline.')
    await page.locator('#areas_for_improvement').fill('Keep documenting edge cases earlier.')
    await page.getByRole('button', { name: 'Gửi đánh giá' }).click()
    await expect(page.getByText('Review submitted successfully')).toBeVisible()

    await login(page, seedData.peerEmail, { organizationId: seedData.organizationId })
    await page.goto(`${BASE_URL}/reviews/${seedData.reviewSessionId}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Peer review' }).click()
    await fillSkillRating(page, seedData.skillId, 'l9')
    await page.getByRole('button', { name: 'Gửi đánh giá' }).click()
    await expect(page.getByText('Review submitted successfully')).toBeVisible()

    await login(page, seedData.revieweeEmail, { organizationId: seedData.organizationId })
    await page.goto(`${BASE_URL}/reviews/${seedData.reviewSessionId}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('tab', { name: 'Xác nhận' }).click()
    await page.getByRole('button', { name: /Tranh chấp/ }).click()
    await page
      .locator('#dispute-reason')
      .fill('Peer rating did not account for the PR evidence attached before review.')
    await page.getByRole('button', { name: 'Gửi tranh chấp' }).click()
    await expect(page.getByText('Đánh giá này đang bị khiếu nại.')).toBeVisible()

    expect(browserErrors).toEqual([])
  })

  test('two-sided dispute room allows evidence upload and reviewee admin report', async ({
    page,
  }) => {
    const browserErrors: string[] = []
    page.on('pageerror', (error) => browserErrors.push(error.message))

    const seedData = await seed<DisputeSeed>(
      page,
      '/api/testing/seed-review-dispute-exchange-flow',
      { demoNames: true }
    )

    await login(page, seedData.ownerEmail, { organizationId: seedData.organizationId })
    await page.goto(`${BASE_URL}/reviews/disputes/${seedData.disputeId}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Tranh chấp review')).toBeVisible()
    await page.getByRole('tab', { name: 'Thảo luận' }).click()
    await expect(page.getByText('I dispute the L5 score.')).toBeVisible()
    await expect(page.getByText('Reviewer side acknowledges the PR and tests')).toBeVisible()
    await page.locator('#comment-text').fill('Reviewer response: scoring followed available rubric.')
    await page.getByRole('button', { name: 'Gửi phản hồi' }).click()
    await expect(page.getByText('Reviewer response: scoring followed available rubric.')).toBeVisible()

    await login(page, seedData.revieweeEmail, { organizationId: seedData.organizationId })
    await page.goto(`${BASE_URL}/reviews/disputes/${seedData.disputeId}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('tab', { name: 'Thảo luận' }).click()
    await page.locator('#comment-text').fill('Reviewee response: PR evidence shows broader scope.')
    await page.getByRole('button', { name: 'Gửi phản hồi' }).click()
    await expect(page.getByText('Reviewee response: PR evidence shows broader scope.')).toBeVisible()
    await screenshotMain(page, '02-dispute-discussion-two-sided')

    await page.getByRole('tab', { name: 'Minh chứng' }).click()
    await expect(page.getByText('Comment task trong package')).toBeVisible()
    await expect(page.getByText('Submission ready: PR, checkout regression test run')).toBeVisible()
    await expect(page.getByText('Checkout regression pull request')).toBeVisible()
    await screenshotMain(page, '03-dispute-evidence-task-package')
    await page.getByRole('button', { name: 'Thêm' }).click()
    await page.locator('#ev-title').fill('Dispute PR package')
    await page.locator('#ev-url').fill('https://example.com/dispute-pr')
    await page.locator('#ev-desc').fill('Evidence package added inside dispute room.')
    await page.getByRole('button', { name: 'Xác nhận thêm' }).click()
    await expect(page.getByText('Dispute PR package')).toBeVisible()

    await page.goto(`${BASE_URL}/tasks/${seedData.taskId}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('tab', { name: 'Thảo luận' }).click()
    await expect(page.getByText('Thảo luận công việc')).toBeVisible()
    await expect(page.getByText('Submission ready: PR, checkout regression test run')).toBeVisible()
    await screenshotMain(page, '01-task-discussion-comments')

    await page.goto(`${BASE_URL}/reviews/disputes/${seedData.disputeId}`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('tab', { name: 'Tổng quan' }).click()
    await page
      .getByPlaceholder('Nêu ngắn gọn vì sao cần admin can thiệp...')
      .fill('Two-sided exchange is stuck; admin should review evidence package.')
    await expect(page.getByRole('button', { name: 'Báo cáo lên admin' })).toBeEnabled()
    await screenshotMain(page, '04-dispute-overview-report-ready')
    await page.getByRole('button', { name: 'Báo cáo lên admin' }).click()
    await expect(page.getByText('Admin đang xem xét').first()).toBeVisible()

    expect(browserErrors).toEqual([])
  })
})
