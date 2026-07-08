import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { test, expect, type Locator, type Page } from '@playwright/test'

import { seedProjectMemberFlow } from '../../../../org/tests/shared/e2e/support/seeded_project_member_flow'
import { login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/marketplace-profile-demo')
const REGULAR_USER = 'tranngocduyet31@gmail.com'
const PROFILE_CATEGORY_LABELS = ['Công nghệ', 'Kỹ thuật phần mềm', 'Kỹ năng mềm', 'Thực thi']

interface SeededMarketplaceApplicationContext {
  organizationId: string
  taskId: string
  applicantEmail: string
  taskTitle: string
}

async function waitForPaint(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolvePaint) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolvePaint()))
      })
  )
}

async function screenshotMain(page: Page, name: string) {
  const path = resolve(SCREENSHOT_DIR, `${name}.png`)
  mkdirSync(dirname(path), { recursive: true })
  await page.evaluate(() => window.scrollTo(0, 0))
  await waitForPaint(page)
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

async function screenshotLocator(page: Page, locator: Locator, name: string) {
  const path = resolve(SCREENSHOT_DIR, `${name}.png`)
  mkdirSync(dirname(path), { recursive: true })
  await locator.scrollIntoViewIfNeeded()
  await waitForPaint(page)
  await locator.screenshot({ path })
}

async function screenshotViewport(page: Page, name: string) {
  const path = resolve(SCREENSHOT_DIR, `${name}.png`)
  mkdirSync(dirname(path), { recursive: true })
  await waitForPaint(page)
  await page.screenshot({ path, fullPage: false })
}

async function seedMarketplaceApplicationFlow(page: Page): Promise<SeededMarketplaceApplicationContext> {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 10)
  await page.goto('/marketplace/tasks')
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  const response = await page.request.post(`${BASE_URL}/api/testing/seed-marketplace-application-flow`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': csrfToken ?? '',
    },
    data: {
      timestamp,
      nonce,
      withApplication: false,
      demoNames: true,
    },
  })

  expect(response.status()).toBe(200)
  const body = (await response.json()) as { data: SeededMarketplaceApplicationContext }
  expect(body.data.taskId).toMatch(/^[0-9a-f-]{36}$/i)
  expect(body.data.organizationId).toMatch(/^[0-9a-f-]{36}$/i)
  expect(body.data.applicantEmail).toContain('@')
  expect(body.data.taskTitle).toContain('Checkout')
  return body.data
}

test.describe('Marketplace and profile demo visual audit', () => {
  test('captures profile and marketplace surfaces', async ({ page }) => {
    await login(page, REGULAR_USER)

    await page.goto(`${BASE_URL}/profile`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Capability dossier' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Profile sections' })).toBeVisible()
    await screenshotMain(page, '01-profile-overview')

    await page.getByRole('link', { name: 'Năng lực' }).click()
    const skillsSection = page.locator('#profile-skills')
    await expect(skillsSection.getByRole('heading', { name: 'Bản đồ năng lực' })).toBeVisible()
    await screenshotLocator(page, skillsSection, '02-profile-skill-atlas')

    await page.getByRole('link', { name: 'Evidence' }).click()
    const evidenceSection = page.locator('#profile-evidence')
    await expect(evidenceSection.getByText('Đánh giá hai chiều', { exact: true })).toBeVisible()
    await screenshotLocator(page, evidenceSection, '03-profile-featured-reviews')

    await page.goto(`${BASE_URL}/profile/edit`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Quản lý kỹ năng' })).toBeVisible()
    for (const label of PROFILE_CATEGORY_LABELS) {
      await expect(page.getByText(label).first()).toBeVisible()
    }
    await screenshotMain(page, '03b-profile-edit')

    await page.getByRole('button', { name: 'Thêm kỹ năng' }).click()
    await expect(page.getByRole('heading', { name: 'Thêm kỹ năng' })).toBeVisible()
    const addSkillDialog = page.locator('div.fixed.inset-0').first()
    await expect(addSkillDialog.getByRole('button', { name: 'Có sẵn', exact: true })).toBeVisible()
    await expect(
      addSkillDialog.getByRole('button', { name: 'Kỹ năng mới', exact: true })
    ).toBeVisible()
    await expect(addSkillDialog.getByLabel('Tìm kỹ năng')).toBeVisible()
    await page.locator('#skill-select').click()
    const addSkillDialogText = await addSkillDialog.textContent()
    expect(addSkillDialogText ?? '').not.toMatch(/\((technology|engineering|soft skill|delivery)\)/i)
    await page.keyboard.press('Escape')
    await addSkillDialog.getByRole('button', { name: 'Kỹ năng mới', exact: true }).click()
    await expect(addSkillDialog.getByLabel('Tên kỹ năng')).toBeVisible()
    await addSkillDialog.getByLabel('Tên kỹ năng').fill(`Visual Custom Skill ${Date.now()}`)
    await addSkillDialog.getByLabel('Nhóm kỹ năng').selectOption('engineering')
    await page.locator('#level-select').click()
    await addSkillDialog.locator('[data-value="l7"]').click()
    await screenshotViewport(page, '03c-profile-edit-add-skill')

    const seeded = await seedMarketplaceApplicationFlow(page)
    await page.context().clearCookies()
    await login(page, seeded.applicantEmail)

    await page.goto(`${BASE_URL}/marketplace/tasks`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Thị trường task', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: seeded.taskTitle })).toBeVisible()
    const taskCard = page.locator('article').filter({ hasText: seeded.taskTitle })
    await expect(taskCard).not.toContainText('Task chưa khai báo kỹ năng bắt buộc')
    await expect(taskCard).not.toContainText('Không yêu cầu')
    await expect(taskCard).not.toContainText('Chưa khai báo range')
    await expect(taskCard).toContainText('L6-L7')
    await screenshotMain(page, '04-marketplace-tasks')
    await taskCard.getByRole('link', { name: 'Xem hồ sơ task' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(new RegExp(`/tasks/${seeded.taskId}`))
    await expect(page.getByRole('heading', { name: seeded.taskTitle })).toBeVisible()
    await screenshotMain(page, '04b-marketplace-task-detail-page')

    await page.goto(`${BASE_URL}/marketplace/tasks`)
    await page.waitForLoadState('networkidle')
    const taskCardForApply = page.locator('article').filter({ hasText: seeded.taskTitle })
    await expect(taskCardForApply.getByText('Có thể gửi đề xuất').first()).toBeVisible()

    await taskCardForApply.getByRole('button', { name: 'Gửi đề xuất tham gia' }).click()
    await expect(page.getByRole('heading', { name: 'Gửi đề xuất tham gia task' })).toBeVisible()
    await screenshotMain(page, '05-marketplace-apply-modal')

    const talentDirectoryContext = await seedProjectMemberFlow(page, { demoNames: true })
    await page.context().clearCookies()
    await login(page, talentDirectoryContext.ownerEmail, {
      organizationId: talentDirectoryContext.organizationId,
    })
    await page.goto(`${BASE_URL}/org/talents`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /Danh bạ Talent Tổ chức/i, level: 1 })).toBeVisible()
    await screenshotMain(page, '06-marketplace-talents')
  })
})
