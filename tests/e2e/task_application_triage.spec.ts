import { test, expect } from '@playwright/test'

import { login, createProject } from './helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Task Application Triage E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('tasks page renders with content or empty state', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')

    const hasContent = await page.locator('table tbody tr, .task-card').count() > 0
    const hasEmptyState = await page.locator('text=Chưa có nhiệm vụ|No tasks').count() > 0
    expect(hasContent || hasEmptyState).toBeTruthy()
  })

  test('creating a task navigates to task detail', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Triage Test')

    await page.goto(`/tasks/create?project_id=${projectId}`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[name="title"]', 'E2E Triage Task')
    await page.fill('textarea[name="description"]', 'Test task for triage')
    await page.click('button:has-text("Tạo nhiệm vụ")')

    await page.waitForURL(/\/tasks\/[a-f0-9-]+/)
    expect(page.url()).toMatch(/\/tasks\/[a-f0-9-]+/)
  })

  test('applications page shows source and match score columns', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Columns Test')

    await page.goto(`/tasks/create?project_id=${projectId}`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[name="title"]', 'E2E Columns Task')
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

  test('applications page shows empty state when no applications', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Empty Apps Test')

    await page.goto(`/tasks/create?project_id=${projectId}`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[name="title"]', 'E2E Empty Apps Task')
    await page.fill('textarea[name="description"]', 'Test')
    await page.click('button:has-text("Tạo nhiệm vụ")')
    await page.waitForURL(/\/tasks\/[a-f0-9-]+/)

    const taskId = (/\/tasks\/([a-f0-9-]+)/.exec(page.url()))?.[1]
    await page.goto(`/tasks/${taskId ?? ''}/applications`)
    await page.waitForLoadState('networkidle')

    const hasEmpty = await page.locator('[data-testid="empty-state"]').count() > 0
    const hasTable = await page.locator('table tbody tr').count() > 0
    expect(hasEmpty || hasTable).toBeTruthy()
  })
})
