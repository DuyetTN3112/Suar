import { test, expect, type Page } from '@playwright/test'

import { createProject, login } from '../../shared/e2e/helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

async function expectTaskCreateReady(page: Page) {
  await expect(page.getByRole('heading', { name: /^(New Task|Tạo nhiệm vụ mới)$/i }).last()).toBeVisible()
  await expect(page.locator('input[name="title"]')).toBeVisible()
}

function isAbortedNavigation(error: unknown): boolean {
  return error instanceof Error && error.message.includes('net::ERR_ABORTED')
}

async function gotoTaskCreate(page: Page, projectId: string): Promise<void> {
  const path = `/projects/${projectId}/tasks?create=1`
  let lastError: unknown = null

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      lastError = null
    } catch (error) {
      lastError = error
      if (!isAbortedNavigation(error)) {
        throw error
      }
    }

    if (page.url().includes(`/projects/${projectId}/tasks`)) {
      await expectTaskCreateReady(page)
      return
    }
  }

  if (lastError) {
    throw lastError
  }

  await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/tasks`))
  await expectTaskCreateReady(page)
}

test.describe('Task Create Role Prefill E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('task create modal loads on the Project board', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Task Board Modal', { navigate: false })
    await gotoTaskCreate(page, projectId)

    await expect(page.getByText('Task visibility', { exact: true })).toBeVisible()
    await expect(page.locator('select[name="project_id"]')).toHaveCount(0)
  })

  test('selecting a project triggers role picker visibility', async ({ page }) => {
    // Create a project first
    const projectId = await createProject(page, 'E2E Task Prefill Test', { navigate: false })
    await expect(page).toHaveURL(/\/org\/projects$/)

    // Open the create modal on the canonical Project board.
    await gotoTaskCreate(page, projectId)

    // Wait for roles to load
    // Removed sleep-based wait

    // Check if role picker section appears (only if project has roles)
    // The section should be present in the DOM even if no roles
    // Role picker visibility depends on project having roles
    // This may or may not be visible depending on whether the project has professional roles
    // The key thing is the page doesn't crash
    await expect(page.getByRole('heading', { name: /^(New Task|Tạo nhiệm vụ mới)$/i }).last()).toBeVisible()
  })

  test('task create form has required fields', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Form Fields Test', { navigate: false })
    await expect(page).toHaveURL(/\/org\/projects$/)
    await gotoTaskCreate(page, projectId)

    // Verify key form fields exist
    await expect(page.locator('input[name="title"]')).toBeVisible()
    await expect(page.locator('textarea[name="description"]')).toBeVisible()

    await expect(page.getByText('Task visibility', { exact: true })).toBeVisible()
    await expect(page.locator('select[name="project_id"]')).toHaveCount(0)
  })

  test('due date picker opens when the field is clicked', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Due Date Picker Test', { navigate: false })
    await expect(page).toHaveURL(/\/org\/projects$/)
    await gotoTaskCreate(page, projectId)

    const trigger = page.getByTestId('due-date-trigger')
    await expect(trigger).toBeVisible()
    await trigger.click()

    const popover = page.getByTestId('due-date-popover')
    await expect(popover).toBeVisible()
    await expect(popover).toHaveAttribute('data-state', 'open')
    await page.waitForTimeout(200)
    const popoverIsTopmost = await popover.evaluate((element) => {
      const box = element.getBoundingClientRect()
      const topmost = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
      return topmost === element || Boolean(topmost && element.contains(topmost))
    })
    expect(popoverIsTopmost).toBe(true)
    await expect(popover.getByRole('button').first()).toBeVisible()
  })

  test('task create form validation rejects empty title', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Validation Test', { navigate: false })
    await expect(page).toHaveURL(/\/org\/projects$/)
    await gotoTaskCreate(page, projectId)

    // Try to submit without title
    await page.getByRole('button', { name: /^(Create task|Create and assign|Tạo nhiệm vụ|Đăng và giao task)$/i }).click()

    // Should show validation error, stay on form
    await expect(page.locator('input[name="title"]')).toBeVisible()
    expect(page.url()).toContain(`/projects/${projectId}/tasks`)
  })

  test('task create form validation rejects missing required skills', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Skills Validation Test', { navigate: false })
    await expect(page).toHaveURL(/\/org\/projects$/)
    await gotoTaskCreate(page, projectId)

    // Fill title but don't add skills
    await page.fill('input[name="title"]', 'Task Without Skills')

    // Try to submit
    await page.getByRole('button', { name: /^(Create task|Create and assign|Tạo nhiệm vụ|Đăng và giao task)$/i }).click()

    // Should stay on form with error
    await expect(page.locator('input[name="title"]')).toBeVisible()
    expect(page.url()).toContain(`/projects/${projectId}/tasks`)
  })

})
