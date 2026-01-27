import { test, expect } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const REGULAR_USER = 'tranngocduyet31@gmail.com'
const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const PROFILE_CATEGORY_LABELS = [
  /^(Technology|Công nghệ)$/,
  /^(Software engineering|Kỹ thuật phần mềm)$/,
  /^(Soft skills|Kỹ năng mềm)$/,
  /^(Delivery|Thực thi)$/,
]

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
      workHistorySection.getByRole('heading', { name: /^(Organizations|Tổ chức) \(\d+\)$/ })
    ).toBeVisible()
    await expect(
      workHistorySection.getByRole('heading', { name: /^(Projects|Dự án) \(\d+\)$/ })
    ).toBeVisible()
  })
})
