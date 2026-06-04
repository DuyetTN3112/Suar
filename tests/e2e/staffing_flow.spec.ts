import { test, expect } from '@playwright/test'

import { login, createProject } from './helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('End-to-End Staffing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('create project → verify member form contract', async ({ page }) => {
    await createProject(page, 'E2E Staffing Flow')

    await page.click('text=Thành viên')
    await page.waitForLoadState('networkidle')

    await page.click('text=Thêm thành viên')

    // Verify email input is NOT present
    await expect(page.locator('input[type="email"]')).toHaveCount(0)

    // Verify user_id input IS present
    await expect(page.locator('#user_id')).toBeVisible()
    await expect(page.locator('#user_id')).toHaveAttribute('type', 'text')
    await expect(page.locator('#user_id')).toHaveAttribute('placeholder', 'Nhập User ID')

    // Verify role selector
    await expect(page.locator('#project_role')).toBeVisible()
    await expect(page.locator('#project_role option')).toHaveCount(4)

    await page.keyboard.press('Escape')
  })

  test('project member list shows at least the owner', async ({ page }) => {
    await createProject(page, 'E2E Member List')
    await page.click('text=Thành viên')
    await page.waitForLoadState('networkidle')

    const memberCards = page.locator('.border.rounded-md')
    const count = await memberCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('member card has role selector', async ({ page }) => {
    await createProject(page, 'E2E Role Selector')
    await page.click('text=Thành viên')
    await page.waitForLoadState('networkidle')

    const memberCards = page.locator('.border.rounded-md')
    const count = await memberCards.count()
    expect(count).toBeGreaterThan(0)

    const firstCard = memberCards.first()
    const roleSelect = firstCard.locator('select').first()
    await expect(roleSelect).toBeVisible()
  })

  test('candidate source labels show on applications page', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Source Labels')

    await page.goto(`/tasks/create?project_id=${projectId}`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[name="title"]', 'E2E Source Task')
    await page.fill('textarea[name="description"]', 'Test')
    await page.click('button:has-text("Tạo nhiệm vụ")')
    await page.waitForURL(/\/tasks\/[a-f0-9-]+/)

    const taskId = (/\/tasks\/([a-f0-9-]+)/.exec(page.url()))?.[1]
    await page.goto(`/tasks/${taskId ?? ''}/applications`)
    await page.waitForLoadState('networkidle')

    const hasSourceCol = await page.locator('th:has-text("Nguồn")').count() > 0
    const hasEmptyState = await page.locator('[data-testid="empty-state"]').count() > 0
    expect(hasSourceCol || hasEmptyState).toBeTruthy()
  })
})
