import { Page, expect } from '@playwright/test'

const BASE_URL = 'http://127.0.0.1:3333'

/**
 * Login via the testing backdoor endpoint.
 */
export async function login(page: Page, email: string) {
  const resp = await page.request.post(`${BASE_URL}/api/testing/login`, {
    data: { email, provider: 'google' },
  })
  expect(resp.ok()).toBeTruthy()
  await page.goto(`${BASE_URL}/org`)
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Find a project ID by its name on the org projects page.
 */
export async function findProjectIdByName(page: Page, name: string): Promise<string> {
  await page.goto(`${BASE_URL}/org/projects`)
  await page.waitForLoadState('domcontentloaded')

  const linkSel = `a:has-text("${name}")`
  const link = page.locator(linkSel).first()
  if (await link.count() > 0) {
    const href = await link.getAttribute('href')
    const match = href?.match(/\/org\/projects\/([a-f0-9-]+)/)
    if (match) return match[1]!
  }

  return ''
}

/**
 * Navigate to a project page.
 */
export async function navigateToProject(page: Page, projectId: string) {
  await page.goto(`${BASE_URL}/org/projects/${projectId}`)
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Add a member to a project by user_id with a specific role.
 */
export async function addProjectMember(
  page: Page,
  projectId: string,
  userId: string,
  role: string
) {
  await navigateToProject(page, projectId)
  await page.click('text=Thành viên')
  await page.waitForSelector('#user_id', { state: 'visible' })
  await page.fill('#user_id', userId)
  await page.selectOption('#project_role', role)
  await page.click('button:has-text("Thêm")')
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Update a member's role in the project.
 */
export async function updateMemberRole(
  page: Page,
  projectId: string,
  memberUserId: string,
  newRole: string
) {
  await navigateToProject(page, projectId)
  await page.click('text=Thành viên')
  const memberCard = page.locator('.border.rounded-md').filter({
    has: page.locator(`text=${memberUserId}`),
  }).first()
  const roleSelect = memberCard.locator('select').first()
  await roleSelect.selectOption(newRole)
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Remove a member from the project.
 */
export async function removeProjectMember(
  page: Page,
  projectId: string,
  memberUserId: string
) {
  await navigateToProject(page, projectId)
  await page.click('text=Thành viên')
  const memberCard = page.locator('.border.rounded-md').filter({
    has: page.locator(`text=${memberUserId}`),
  }).first()
  page.once('dialog', (dialog) => dialog.accept())
  await memberCard.locator('button:has-text("Xóa")').click()
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Create a task with role prefill.
 */
export async function createTaskWithRole(
  page: Page,
  title: string,
  projectId: string,
  roleId: string
) {
  await page.goto(`${BASE_URL}/tasks/create?project_id=${projectId}`)
  await page.waitForLoadState('domcontentloaded')
  await page.fill('input[name="title"]', title)
  await page.fill('textarea[name="description"]', `Task: ${title}`)
  const rolePicker = page.locator('text=Chọn Professional Role')
  if (await rolePicker.count() > 0) {
    const selectEl = page.locator('select').filter({
      has: page.locator('option[value="' + roleId + '"]'),
    }).first()
    if (await selectEl.count() > 0) {
      await selectEl.selectOption(roleId)
      await page.click('button:has-text("Prefill kỹ năng")')
      await page.waitForSelector('button:has-text("Prefill kỹ năng"):not([disabled])', { state: 'visible' })
    }
  }
  const acField = page.locator('textarea[name="acceptance_criteria"], input[name="acceptance_criteria"]').first()
  if (await acField.count() > 0) {
    await acField.fill('Acceptance criteria for ' + title)
  }
  await page.click('button:has-text("Tạo nhiệm vụ")')
  await page.waitForURL(/\/tasks\/[a-f0-9-]+/)
}


/**
 * Create a project via the UI and return its ID from the URL.
 */
export async function createProject(page: Page, name: string): Promise<string> {
  await page.goto(`${BASE_URL}/projects/create`)
  await page.waitForLoadState('domcontentloaded')

  await page.fill('input[name="name"]', name)
  const descInput = page.locator('textarea[name="description"]').first()
  if (await descInput.count() > 0) {
    await descInput.fill(`Description for ${name}`)
  }

  await page.click('button:has-text("Tạo")')
  await page.waitForURL(/\/projects\/[a-f0-9-]+/)
  const url = page.url()
  const match = url.match(/\/projects\/([a-f0-9-]+)/)
  return match ? match[1]! : ''
}

/**
 * Get the CSRF token from the page meta tag.
 */
export async function getCsrfToken(page: Page): Promise<string> {
  const token = page.locator('meta[name="csrf-token"]')
  return (await token.getAttribute('content')) || ''
}
