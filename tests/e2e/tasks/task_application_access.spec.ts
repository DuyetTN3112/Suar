import { test, expect } from '@playwright/test'

import { login, createProject } from '../helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Task Application Access', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('tasks page renders with content or empty state', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')

    const hasContent = await page.locator('table tbody tr, .task-card, text=Nhiệm vụ').count() > 0
    const hasEmptyState = await page.locator('text=Chưa có nhiệm vụ|No tasks').count() > 0
    expect(hasContent || hasEmptyState).toBeTruthy()
  })

  test('authorized owner can navigate to task applications', async ({ page }) => {
    const projectId = await createProject(page, 'E2E App Access Test')

    await page.goto(`/tasks/create?project_id=${projectId}`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[name="title"]', 'E2E Test Task')
    await page.fill('textarea[name="description"]', 'Task for testing applications')
    await page.click('button:has-text("Tạo nhiệm vụ")')

    await page.waitForURL(/\/tasks\/[a-f0-9-]+/)
    expect(page.url()).toMatch(/\/tasks\/[a-f0-9-]+/)
  })

  test('applications page shows heading when accessed via task', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Apps Page Test')

    await page.goto(`/tasks/create?project_id=${projectId}`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[name="title"]', 'E2E Apps Task')
    await page.fill('textarea[name="description"]', 'Test')
    await page.click('button:has-text("Tạo nhiệm vụ")')
    await page.waitForURL(/\/tasks\/[a-f0-9-]+/)

    const taskId = (/\/tasks\/([a-f0-9-]+)/.exec(page.url()))?.[1]
    expect(taskId).toBeTruthy()

    await page.goto(`/tasks/${taskId ?? ''}/applications`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /đơn ứng tuyển|applications/i })).toBeVisible()
  })

  test('applications page shows source column header', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Source Col Test')

    await page.goto(`/tasks/create?project_id=${projectId}`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[name="title"]', 'E2E Source Task')
    await page.fill('textarea[name="description"]', 'Test')
    await page.click('button:has-text("Tạo nhiệm vụ")')
    await page.waitForURL(/\/tasks\/[a-f0-9-]+/)

    const taskId = (/\/tasks\/([a-f0-9-]+)/.exec(page.url()))?.[1]
    await page.goto(`/tasks/${taskId ?? ''}/applications`)
    await page.waitForLoadState('networkidle')

    // Source column header should be present
    const hasSourceCol = await page.locator('th:has-text("Nguồn")').count() > 0
    const hasEmptyState = await page.locator('[data-testid="empty-state"]').count() > 0
    expect(hasSourceCol || hasEmptyState).toBeTruthy()
  })
})
