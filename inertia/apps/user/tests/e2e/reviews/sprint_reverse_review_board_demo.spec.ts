import { resolve } from 'node:path'

import { expect, test, type Locator, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/sprint-reverse-review-board')

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

async function expectTaskSizedKanban(page: Page) {
  const kanban = page.getByRole('region', { name: 'Kanban trạng thái' })
  const scroller = kanban.locator(':scope > div').first()
  const firstLane = kanban.locator(':scope > div > section').first()
  const metrics = await scroller.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
  }))
  const box = await firstLane.boundingBox()

  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth)
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(300)
  expect(box?.width ?? 0).toBeLessThanOrEqual(340)
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(420)
}

async function expectEmptyKanban(page: Page) {
  await expect(page.getByRole('heading', { name: 'Chờ review', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Đang review', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Chờ phản hồi', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tranh chấp', exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Đã gửi report tranh chấp', exact: true })
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Done', exact: true })).toBeVisible()
  await expect(page.getByText('Chưa có kỳ review sau sprint đang mở')).toHaveCount(0)
  await expect(page.getByText('Board vẫn sẵn sàng')).toHaveCount(0)
  await expect(page.getByText('Chưa có card review trong kỳ hiện tại.')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Trống')).toHaveCount(6)
  await expectTaskSizedKanban(page)
}

interface SeedResponse {
  data: {
    organizationId: string
    sprintId: string
    ownerEmail: string
    workerEmail: string
    assignerEmail: string
  }
}

test.describe('Sprint reverse review board demo flow', () => {
  test('reverse reviews history page renders when user has no review data', async ({ page }) => {
    const browserErrors: string[] = []
    page.on('pageerror', (error) => browserErrors.push(error.message))

    const email = `empty-reverse-history-${Date.now()}@test.com`
    await login(page, email)

    await page.goto('/reviews/reverse-reviews')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Lịch sử review' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Tôi nhận được/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Tôi đã gửi/ })).toBeVisible()
    await expect(page.getByText('Chưa có review nào bạn nhận được.')).toBeVisible()
    expect(browserErrors).toEqual([])
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/08-empty-review-history.png`)
  })

  test('manager and environment pages keep kanban visible before a review window opens', async ({
    page,
  }) => {
    const email = `empty-reverse-board-${Date.now()}@test.com`

    await login(page, email)

    await page.goto('/reviews/sprint-reverse-board?review_type=manager')
    await expect(page.getByRole('heading', { name: 'Review người giao việc' })).toBeVisible()
    await expectEmptyKanban(page)
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/00-empty-manager-kanban.png`)

    await page.goto('/reviews/sprint-reverse-board?review_type=environment')
    await expect(page.getByRole('heading', { name: 'Review môi trường làm việc' })).toBeVisible()
    await expectEmptyKanban(page)
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/00-empty-environment-kanban.png`)
  })

  test('worker, manager, and owner can complete post-sprint review board flow', async ({
    page,
  }) => {
    const seed = await page.request.post(
      `${BASE}/api/testing/seed-sprint-reverse-review-board-flow`,
      {
        data: {
          timestamp: Date.now(),
          nonce: 'sprint-reverse-board',
        },
      }
    )
    expect(seed.status()).toBe(201)
    const seeded = (await seed.json()) as SeedResponse
    const { organizationId, workerEmail, assignerEmail, ownerEmail } = seeded.data

    await login(page, workerEmail, { organizationId })
    await page.goto('/reviews/sprint-reverse-board?review_type=manager')
    await expect(page.getByRole('heading', { name: 'Review người giao việc' })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('500')

    await expect(page.getByRole('heading', { name: 'Đang review' })).toBeVisible()
    await expect(page.getByText('Clarify onboarding checklist')).toHaveCount(0)
    await activateButton(
      page,
      page.getByRole('region', { name: 'Kanban trạng thái' }).getByRole('button').first()
    )
    const managerDialog = page.getByRole('dialog', { name: /sprint_reverse_assigner/i })
    await expect(managerDialog).toBeVisible()
    await expect(managerDialog.getByText('Clarify onboarding checklist')).toBeVisible()
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/01-worker-assigner-awaiting-review.png`)

    await managerDialog
      .getByLabel('Review')
      .fill('Assigner gave clear task context and useful priority calls.')
    await managerDialog.getByLabel('Review').blur()
    await managerDialog.getByRole('button', { name: 'Gửi review' }).click()
    await expect(page.getByText(/Trạng thái:\s*Chờ phản hồi/)).toBeVisible()
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/02-worker-assigner-awaiting-response.png`)

    await login(page, assignerEmail, { organizationId })
    await page.goto('/reviews/sprint-reverse-board?review_type=manager')
    await activateButton(
      page,
      page.getByRole('region', { name: 'Kanban trạng thái' }).getByRole('button').first()
    )
    const assignerDialog = page.getByRole('dialog')
    await expect(assignerDialog.getByText(/Trạng thái:\s*Chờ phản hồi/)).toBeVisible()
    await assignerDialog.getByRole('button', { name: 'Đồng ý' }).click()
    await expect(page.getByText(/Trạng thái:\s*Done/)).toBeVisible()
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/03-assigner-done.png`)

    await login(page, workerEmail, { organizationId })
    await page.goto('/reviews/sprint-reverse-board?review_type=environment')
    await expect(page.getByRole('heading', { name: 'Review môi trường làm việc' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Đang review' })).toBeVisible()
    const environmentCard = page
      .getByRole('region', { name: 'Kanban trạng thái' })
      .getByRole('button', { name: /Project \+ tổ chức \+ đồng nghiệp/ })
      .first()
    await expect(environmentCard).toBeVisible()
    await activateButton(page, environmentCard)
    const environmentDialog = page.getByRole('dialog', { name: /Môi trường làm việc/ })
    await expect(environmentDialog).toBeVisible()
    await environmentDialog
      .getByLabel('Review')
      .fill('Environment was productive, but coordination rituals need more structure.')
    await environmentDialog.getByLabel('Review').blur()
    await environmentDialog.getByRole('button', { name: 'Gửi review' }).click()
    await expect(page.getByText(/Trạng thái:\s*Chờ phản hồi/)).toBeVisible()
    await captureBoardScreenshot(
      page,
      `${SCREENSHOT_DIR}/04-worker-environment-awaiting-response.png`
    )

    await page.goto('/reviews/reverse-reviews')
    await expect(page.getByRole('heading', { name: 'Lịch sử review' })).toBeVisible()
    await activateButton(page, page.getByRole('button', { name: /Tôi đã gửi/ }))
    await expect(page.getByText('Review người giao việc đã gửi').first()).toBeVisible()
    await expect(page.getByText('Review môi trường đã gửi').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Xem chi tiết/ }).first()).toBeVisible()
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/07-worker-review-history-sent-list.png`)

    await login(page, ownerEmail, { organizationId })
    await page.goto('/reviews/sprint-reverse-board?review_type=environment')
    await activateButton(page, page.getByRole('button', { name: /Môi trường làm việc.*4\/5/ }))
    const ownerDialog = page.getByRole('dialog', { name: /Môi trường làm việc/ })
    await expect(ownerDialog).toBeVisible()
    await ownerDialog
      .getByPlaceholder('Phản hồi để đưa vào tranh chấp')
      .fill('Owner response: we will tighten sprint planning next cycle.')
    await ownerDialog.getByPlaceholder('Phản hồi để đưa vào tranh chấp').blur()
    await ownerDialog.getByRole('button', { name: 'Phản hồi / tranh chấp' }).click()
    await expect(page.getByText(/Trạng thái:\s*Tranh chấp/)).toBeVisible()
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/05-owner-environment-disputed.png`)

    await ownerDialog.getByRole('button', { name: 'Đồng ý' }).click()
    await expect(page.getByText(/Trạng thái:\s*Done/)).toBeVisible()
    await captureBoardScreenshot(page, `${SCREENSHOT_DIR}/06-owner-environment-done.png`)
  })
})
