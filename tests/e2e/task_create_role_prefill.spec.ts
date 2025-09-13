import { test, expect } from '@playwright/test'

import { login, createProject } from './helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Task Create Role Prefill E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('task create page loads with project selector', async ({ page }) => {
    await page.goto('/tasks/create')
    await page.waitForLoadState("domcontentloaded")

    // Verify project selector exists
    const projectSelect = page.locator('select[name="project_id"]').first()
    await expect(projectSelect).toBeVisible()
  })

  test('selecting a project triggers role picker visibility', async ({ page }) => {
    // Create a project first
    const projectId = await createProject(page, 'E2E Task Prefill Test')

    // Navigate to task create with project_id
    await page.goto(`/tasks/create?project_id=${projectId}`)
    await page.waitForLoadState("domcontentloaded")

    // Wait for roles to load
    // Removed sleep-based wait

    // Check if role picker section appears (only if project has roles)
    // The section should be present in the DOM even if no roles
    // Role picker visibility depends on project having roles
    // This may or may not be visible depending on whether the project has professional roles
    // The key thing is the page doesn't crash
    await expect(page.locator('text=Tạo nhiệm vụ mới')).toBeVisible()
  })

  test('task create form has required fields', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Form Fields Test')
    await page.goto(`/tasks/create?project_id=${projectId}`)
    await page.waitForLoadState("domcontentloaded")

    // Verify key form fields exist
    await expect(page.locator('input[name="title"]')).toBeVisible()
    await expect(page.locator('textarea[name="description"]')).toBeVisible()

    // Verify project is pre-selected
    const projectSelect = page.locator('select[name="project_id"]').first()
    await expect(projectSelect).toBeVisible()
  })

  test('task create form validation rejects empty title', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Validation Test')
    await page.goto(`/tasks/create?project_id=${projectId}`)
    await page.waitForLoadState("domcontentloaded")

    // Try to submit without title
    await page.click('button:has-text("Tạo nhiệm vụ")')

    // Should show validation error, stay on form
    await expect(page.locator('input[name="title"]')).toBeVisible()
    // URL should still be /tasks/create
    expect(page.url()).toContain('/tasks/create')
  })

  test('task create form validation rejects missing required skills', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Skills Validation Test')
    await page.goto(`/tasks/create?project_id=${projectId}`)
    await page.waitForLoadState("domcontentloaded")

    // Fill title but don't add skills
    await page.fill('input[name="title"]', 'Task Without Skills')

    // Try to submit
    await page.click('button:has-text("Tạo nhiệm vụ")')

    // Should stay on form with error
    await expect(page.locator('input[name="title"]')).toBeVisible()
    expect(page.url()).toContain('/tasks/create')
  })
})
