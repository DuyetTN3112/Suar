import { resolve } from 'node:path'

import { expect, test } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/profile')
const PROFILE_CATEGORY_LABELS = ['Công nghệ', 'Kỹ thuật phần mềm', 'Kỹ năng mềm', 'Thực thi']

test.describe('Profile mobile layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true })

  test('profile dossier and edit surfaces fit without horizontal overflow', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
    })

    await login(page, E2E_USER)
    await page.goto('/profile')

    await expect(page.getByRole('heading', { name: 'Capability dossier' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Profile sections' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tổng quan' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Năng lực' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Evidence' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Kinh nghiệm' })).toBeVisible()
    await expect(page.getByText('Capability verified')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bản đồ năng lực' })).toBeVisible()
    if (await page.getByRole('heading', { name: 'Chưa có skill được xác thực' }).isVisible()) {
      await expect(page.getByText(/skill evidence sẽ xuất hiện ở đây/i)).toBeVisible()
    }
    for (const label of PROFILE_CATEGORY_LABELS) {
      await expect(page.getByText(label).first()).toBeVisible()
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    )
    expect(hasHorizontalOverflow).toBe(false)
    expect(pageErrors).toEqual([])

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/profile-mobile.png`,
      fullPage: true,
    })

    await page.getByRole('link', { name: 'Chỉnh sửa' }).click()
    await expect(page).toHaveURL(/\/profile\/edit/)
    await expect(page.getByRole('heading', { name: 'Thông tin cá nhân' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quản lý kỹ năng' })).toBeVisible()
    for (const label of PROFILE_CATEGORY_LABELS) {
      await expect(page.getByText(label).first()).toBeVisible()
    }

    const editHasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    )
    expect(editHasHorizontalOverflow).toBe(false)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/profile-edit-mobile.png`,
      fullPage: true,
    })

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
    const customSkillName = `E2E Custom Skill ${Date.now()}`
    await addSkillDialog.getByLabel('Tên kỹ năng').fill(customSkillName)
    await addSkillDialog.getByLabel('Nhóm kỹ năng').selectOption('engineering')
    await page.locator('#level-select').click()
    await addSkillDialog.locator('[data-value="l7"]').click()
    const modalHasHeaderOnTop = await page.evaluate(() => {
      return Boolean(document.elementFromPoint(24, 24)?.closest('header'))
    })
    expect(modalHasHeaderOnTop).toBe(false)
    const modalHasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    )
    expect(modalHasHorizontalOverflow).toBe(false)
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/profile-edit-add-skill-mobile.png`,
      fullPage: true,
    })
    await addSkillDialog.getByRole('button', { name: 'Thêm kỹ năng', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Thêm kỹ năng' })).toHaveCount(0)
    await expect(page.getByText(customSkillName)).toBeVisible()
  })
})
