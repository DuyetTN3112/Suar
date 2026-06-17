import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { test, expect, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/reverse-sprint-dispute')

interface SeedResponse {
  data: {
    organizationId: string
    projectId: string
    sprintId: string
    ownerEmail: string
    workerEmail: string
  }
}

async function seedSprintGovernance(page: Page): Promise<SeedResponse['data']> {
  const response = await page.request.post(
    `${BASE_URL}/api/testing/seed-sprint-review-governance-flow`,
    {
      data: {
        timestamp: Date.now(),
        nonce: Math.random().toString(36).slice(2, 8),
        taskInSprint: true,
      },
    }
  )
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as SeedResponse
  return body.data
}

async function screenshot(page: Page, name: string) {
  const path = resolve(SCREENSHOT_DIR, `${name}.png`)
  mkdirSync(dirname(path), { recursive: true })
  await page.screenshot({ path, fullPage: true })
}

test.describe('Reverse sprint review dispute room experience', () => {
  test('worker and project owner can discuss a submitted sprint review dispute before admin report', async ({
    page,
  }) => {
    const browserErrors: string[] = []
    page.on('pageerror', (error) => browserErrors.push(error.message))

    const seed = await seedSprintGovernance(page)

    await login(page, seed.ownerEmail, { organizationId: seed.organizationId })
    await page.goto(`${BASE_URL}/org/projects/${seed.projectId}?focus=sprints`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Kết thúc sprint' }).click()
    await expect(page.getByText('Review đang mở cho người tham gia')).toBeVisible()

    await login(page, seed.workerEmail, { organizationId: seed.organizationId })
    await page.goto(`${BASE_URL}/reviews/reverse-reviews`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Sprint reviews cần gửi')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Review người giao việc', exact: true })).toBeVisible()

    const commentBoxes = page.getByPlaceholder(/Điểm mạnh|Quy trình/)
    await expect(commentBoxes).toHaveCount(3)
    await commentBoxes
      .nth(0)
      .fill('Manager support was useful, but rating context needs correction.')
    await commentBoxes.nth(1).fill('Project process needs clearer sprint close notes.')
    await commentBoxes.nth(2).fill('Organization support was responsive.')
    await screenshot(page, '01-worker-draft')

    await page.getByRole('button', { name: 'Gửi sprint review' }).click()
    await expect(page.getByText('Đã gửi sprint review', { exact: true })).toBeVisible()
    await screenshot(page, '02-worker-submitted')

    await page
      .getByPlaceholder('Điểm nào trong sprint review cần phản biện?')
      .fill('Sprint review needs project-side context before it becomes final.')
    await page.getByRole('button', { name: 'Mở tranh chấp' }).click()
    await expect(page.getByText('Đã mở tranh chấp sprint review.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Mở phòng tranh chấp' })).toBeVisible()

    const disputeHref = await page
      .getByRole('link', { name: 'Mở phòng tranh chấp' })
      .getAttribute('href')
    if (!disputeHref) {
      throw new Error('Missing sprint dispute room link')
    }
    const disputeUrl = new URL(disputeHref, BASE_URL).toString()
    await page.getByRole('link', { name: 'Mở phòng tranh chấp' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Tranh chấp sprint review' })).toBeVisible()
    await expect(page.getByText('Cần phản hồi từ cả người gửi review')).toBeVisible()
    await screenshot(page, '03-worker-dispute-room')

    await page
      .getByPlaceholder('Ghi phản hồi chính thức...')
      .fill('Worker evidence: close notes missed process ambiguity.')
    await page.getByRole('button', { name: 'Gửi phản hồi' }).click()
    await expect(
      page.getByText('Worker evidence: close notes missed process ambiguity.')
    ).toBeVisible()
    await screenshot(page, '04-worker-commented')

    await login(page, seed.ownerEmail, { organizationId: seed.organizationId })
    await page.goto(disputeUrl)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Phản hồi với vai Đại diện project/org')).toBeVisible()
    await page
      .getByPlaceholder('Ghi phản hồi chính thức...')
      .fill('Owner response: project accepts context gap and adds manager-side evidence.')
    await page.getByRole('button', { name: 'Gửi phản hồi' }).click()
    await expect(page.getByText('Owner response: project accepts context gap')).toBeVisible()
    await screenshot(page, '05-owner-counterparty-commented')

    await login(page, seed.workerEmail, { organizationId: seed.organizationId })
    await page.goto(disputeUrl)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: 'Report lên admin' })).toBeVisible()
    await page
      .getByPlaceholder('Vì sao hai bên không tự xử lý được?')
      .fill('Two sides still disagree on final sprint review wording.')
    await page.getByRole('button', { name: 'Report lên admin' }).click()
    await expect(page.getByText('Đã report lên admin.')).toBeVisible()
    await screenshot(page, '06-worker-reported-admin')

    await login(page, seed.ownerEmail, { organizationId: seed.organizationId })
    await page.goto(`${BASE_URL}/org/reviews/sprint-reverse-board?review_type=environment`)
    await page.waitForLoadState('networkidle')

    const kanban = page.getByRole('region', { name: 'Kanban trạng thái' })
    await expect(page.getByRole('heading', { name: 'Review môi trường làm việc' })).toBeVisible()
    await expect(page.getByText('Responder bắt buộc')).toHaveCount(0)

    await kanban.getByRole('button', { name: /Môi trường làm việc/ }).first().click()
    const detailDialog = page.getByRole('dialog', { name: /Môi trường làm việc/ })
    await expect(detailDialog).toBeVisible()
    await expect(detailDialog.getByText('Responder bắt buộc')).toBeVisible()
    await screenshot(page, '07-org-environment-card-detail-dialog')

    expect(browserErrors).toEqual([])
  })
})
