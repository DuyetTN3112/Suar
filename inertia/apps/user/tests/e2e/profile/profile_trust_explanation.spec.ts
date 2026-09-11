import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const REGULAR_USER = 'tranngocduyet31@gmail.com'
const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/profile')
const PROFILE_CATEGORY_LABELS = [
  /^(Technology|Công nghệ)$/,
  /^(Software engineering|Kỹ thuật phần mềm)$/,
  /^(Soft skills|Kỹ năng mềm)$/,
  /^(Delivery|Quản lý công việc)$/,
]

async function waitForStableProfileDom(page: import('@playwright/test').Page) {
  await page.evaluate(
    () =>
      new Promise<void>((settled) => {
        requestAnimationFrame(() => requestAnimationFrame(() => settled()))
      })
  )
}

interface SeededDisputeProfileContext {
  organizationId: string
  revieweeEmail: string
  revieweeId: string
  taskTitle: string
}

async function seedDisputeProfile(
  page: import('@playwright/test').Page,
  options: { verifiedWork?: boolean } = {}
) {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 10)
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  const response = await page.request.post(
    `${BASE_URL}/api/testing/seed-review-dispute-exchange-flow`,
    {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfToken ?? '',
      },
      data: { timestamp, nonce, demoNames: true, verifiedWork: options.verifiedWork ?? false },
    }
  )

  const responseBody = await response.text()
  expect(response.status(), responseBody).toBe(200)
  const body = JSON.parse(responseBody) as {
    data: SeededDisputeProfileContext & { taskId: string }
  }
  return body.data
}

test.describe('Profile Trust & Evidence Explanation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, REGULAR_USER)
  })

  test('profile shows trust score with tier badge', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText('Evidence coverage', { exact: true })).toBeVisible()
    await expect(page.getByText('Delivery reliability', { exact: true })).toBeVisible()
    await expect(page.getByText('Profile trust', { exact: true })).toBeVisible()
  })

  test('profile shows skill atlas with concrete inventory counters', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('domcontentloaded')

    await page.getByRole('tab', { name: /^(Capabilities|Năng lực)$/ }).click()
    const skillsSection = page.locator('#profile-skills')

    await expect(
      skillsSection.getByRole('heading', { name: /^(Capability map|Bản đồ năng lực)$/ })
    ).toBeVisible()
    await expect(
      skillsSection.getByRole('heading', {
        name: /^(All skills by group|Toàn bộ kỹ năng theo nhóm)$/,
      })
    ).toBeVisible()
    await expect(
      skillsSection.getByText(/\d+ (reviewed skills|kỹ năng đã review)/).first()
    ).toBeVisible()
    await expect(
      skillsSection.getByText(/\d+ (imported claims?|khai báo nhập tay)/).first()
    ).toBeVisible()
    for (const label of PROFILE_CATEGORY_LABELS) {
      await expect(skillsSection.getByText(label).first()).toBeVisible()
    }
  })

  test('profile shows review credibility section with reviewed skill count or empty state', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('domcontentloaded')

    await page.getByRole('tab', { name: /^(Evidence|Bằng chứng)$/ }).click()
    const reviewsSection = page.locator('#profile-evidence')

    await expect(
      reviewsSection.getByText(/^(Two-way reviews|Đánh giá hai chiều)$/, { exact: true })
    ).toBeVisible()
    await expect(
      reviewsSection.getByText(/\d+ (reviewed skills|kỹ năng đã được đánh giá)/)
    ).toBeVisible()
    await expect(
      reviewsSection
        .getByRole('heading', { name: /^(Reviews received|Đánh giá nhận được)$/ })
        .or(
          reviewsSection.getByText(
            /^(No featured reviews to show yet\.|Chưa có đánh giá nổi bật để hiển thị\.)$/,
            { exact: true }
          )
        )
        .or(reviewsSection.locator('[aria-label$=" stars"]').first())
    ).toBeVisible()
  })

  test('profile shows work history organization and project sections', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('domcontentloaded')

    await page.getByRole('tab', { name: /^(Experience|Kinh nghiệm)$/ }).click()
    const workHistorySection = page.locator('#profile-work-history')

    await expect(
      workHistorySection.getByRole('heading', {
        name: /^(Demonstrated work|Công việc đã chứng minh) \(\d+\)$/,
      })
    ).toBeVisible()
    await expect(
      workHistorySection
        .getByText(
          /^(No demonstrated work published yet\.|Chưa có công việc đã chứng minh công khai\.)$/
        )
        .or(workHistorySection.locator('[data-testid="profile-demonstrated-work"] article').first())
    ).toBeVisible()

    await expect(
      workHistorySection.getByRole('heading', { name: /^(Organizations|Tổ chức) \(\d+\)$/ })
    ).toBeVisible()
    await expect(
      workHistorySection.getByRole('heading', { name: /^(Projects|Dự án) \(\d+\)$/ })
    ).toBeVisible()

    mkdirSync(SCREENSHOT_DIR, { recursive: true })
    await workHistorySection.screenshot({
      path: resolve(SCREENSHOT_DIR, 'profile-demonstrated-work.png'),
    })
  })

  test('desktop profile keeps semantic tabs, labels, and focusable controls', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('domcontentloaded')

    const tabs = page.getByRole('tab')
    await expect(tabs).not.toHaveCount(0)
    for (let index = 0; index < (await tabs.count()); index += 1) {
      await expect(tabs.nth(index)).toHaveAttribute('aria-selected', /^(true|false)$/)
    }
    await expect(page.locator('img:not([alt])')).toHaveCount(0)
    await expect(page.locator('button:not([aria-label])').filter({ hasText: /^$/ })).toHaveCount(0)

    await page.getByRole('tab', { name: /^(Experience|Kinh nghiệm)$/ }).focus()
    await expect(page.getByRole('tab', { name: /^(Experience|Kinh nghiệm)$/ })).toBeFocused()
  })

  test('user sees legacy work conservatively labeled instead of falsely verified', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('domcontentloaded')
    const seeded = await seedDisputeProfile(page)

    await page.context().clearCookies()
    await login(page, seeded.revieweeEmail, { organizationId: seeded.organizationId })
    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('tab', { name: /^(Experience|Kinh nghiệm)$/ }).click()

    const workHistorySection = page.locator('#profile-work-history')
    const demonstratedWork = workHistorySection.locator('[data-testid="profile-demonstrated-work"]')
    const card = demonstratedWork
      .locator('article')
      .filter({ hasText: 'Checkout release implementation' })

    await expect(card).toBeVisible()
    await expect(card).toContainText('Checkout release implementation')
    await expect(card).toContainText(/Retrospective|Hồi cứu/)
    await expect(card).not.toContainText(/Review confirmed|Đã xác nhận review/)
    await expect(card).toContainText(/task_worker|Người thực hiện/)
    await expect(card).toContainText(/ecommerce/i)

    mkdirSync(SCREENSHOT_DIR, { recursive: true })
    await waitForStableProfileDom(page)
    await workHistorySection.screenshot({
      path: resolve(SCREENSHOT_DIR, 'profile-demonstrated-work-populated.png'),
    })
  })

  test('user sees authoritative verified work with review confirmation and high confidence', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('domcontentloaded')
    const seeded = await seedDisputeProfile(page, { verifiedWork: true })

    await page.context().clearCookies()
    await login(page, seeded.revieweeEmail, { organizationId: seeded.organizationId })
    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('tab', { name: /^(Experience|Kinh nghiệm)$/ }).click()

    const workHistorySection = page.locator('#profile-work-history')
    const card = workHistorySection
      .locator('[data-testid="profile-demonstrated-work"] article')
      .filter({ hasText: 'checkout_release' })

    await expect(card).toBeVisible()
    await expect(card).toContainText('implement')
    await expect(card).toContainText('primary_owner')
    await expect(card).toContainText('ecommerce')
    await expect(card).toContainText('Review confirmed')
    await expect(card).toContainText(/high/i)
    await expect(card).not.toContainText(/Retrospective|Hồi cứu/)

    mkdirSync(SCREENSHOT_DIR, { recursive: true })
    await waitForStableProfileDom(page)
    // The profile card is a keyed Svelte list item and may be replaced after the
    // final projection refresh; capture the stable section that contains it.
    await workHistorySection.screenshot({
      path: resolve(SCREENSHOT_DIR, 'profile-demonstrated-work-verified.png'),
    })
  })

  test('user can publish a snapshot, enable sharing, and open the public profile artifact', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('domcontentloaded')
    const seeded = await seedDisputeProfile(page)

    await page.context().clearCookies()
    await login(page, seeded.revieweeEmail, { organizationId: seeded.organizationId })
    await page.goto(`${BASE_URL}/profile/snapshots`)
    await page.waitForLoadState('domcontentloaded')

    const snapshotName = `Seeded public proof ${Date.now()}`
    await page.getByLabel(/^(Snapshot name|Tên snapshot)$/).fill(snapshotName)
    await page.locator('#publish_public').click()
    await page.getByRole('button', { name: /^(Create snapshot|Tạo snapshot)$/ }).click()

    const currentSharingSwitch = page.getByRole('switch').nth(1)
    await expect(currentSharingSwitch).toHaveAttribute('aria-checked', 'false')
    await currentSharingSwitch.click()
    await expect(currentSharingSwitch).toHaveAttribute('aria-checked', 'true')

    const sharingLink = page
      .locator('p')
      .filter({ hasText: /\/profiles\// })
      .last()
    await expect(sharingLink).toBeVisible()
    const linkText = await sharingLink.textContent()
    const sharedUrl = linkText?.match(/https?:\/\/[^\s]+/)?.[0]
    expect(sharedUrl).toBeTruthy()
    if (!sharedUrl) return

    await page.context().clearCookies()
    await page.goto(sharedUrl)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: snapshotName })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /^(Work highlights|Điểm sáng công việc)$/ })
    ).toBeVisible()
    await expect(page.getByText('Checkout release implementation', { exact: true })).toBeVisible()
    await expect(page.getByText(/Retrospective|Hồi cứu/)).toBeVisible()

    mkdirSync(SCREENSHOT_DIR, { recursive: true })
    await page.locator('main').screenshot({
      path: resolve(SCREENSHOT_DIR, 'profile-public-snapshot-populated.png'),
    })
  })
})
