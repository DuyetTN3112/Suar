import { type Page, expect } from '@playwright/test'

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
 * Create a project via the API and return its ID.
 * Uses page.request with cookies from the browser context.
 */
export async function createProject(page: Page, name: string): Promise<string> {
  // Navigate to org projects to get CSRF token in page context
  await page.goto(`${BASE_URL}/org/projects`)
  await page.waitForLoadState('networkidle')

  // Get CSRF token from meta tag
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  console.log('CSRF token:', csrfToken)

  // Create project via API using page.request (shares cookies)
  const resp = await page.request.post(`${BASE_URL}/org/projects`, {
    headers: {
      'X-CSRF-TOKEN': csrfToken ?? '',
    },
    form: {
      name,
      description: `E2E test: ${name}`,
      status: 'in_progress',
    },
  })

  console.log('Create response status:', resp.status())
  const respBody = await resp.text().catch(() => '')
  console.log('Create response body:', respBody.substring(0, 200))

  if (!resp.ok() && resp.status() !== 200) {
    console.log('Create failed with status:', resp.status())
    return ''
  }

  // Navigate to org projects and find the project link
  await page.goto(`${BASE_URL}/org/projects`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Find project link by text
  const allLinks = page.locator('a[href*="/org/projects/"]')
  const linkCount = await allLinks.count()
  console.log('Project links found:', linkCount)

  for (let i = 0; i < linkCount; i++) {
    const text = await allLinks.nth(i).textContent()
    console.log(`Link ${i}: text=${text?.trim().substring(0, 50) ?? ''}`)
    if (text?.includes(name)) {
      const href = await allLinks.nth(i).getAttribute('href')
      const match = href?.match(/\/org\/projects\/([a-f0-9-]+)/)
      const projectId = match?.[1]
      if (projectId) {
        console.log('Found project ID:', projectId)
        return projectId
      }
    }
  }

  // Fallback: return first project link
  if (linkCount > 0) {
    const href = await allLinks.first().getAttribute('href')
    const match = href?.match(/\/org\/projects\/([a-f0-9-]+)/)
    const projectId = match?.[1]
    if (projectId) {
      console.log('Fallback project ID:', projectId)
      return projectId
    }
  }

  console.log('No project ID found')
  return ''
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
    const projectId = match?.[1]
    if (projectId) return projectId
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
 * Get the CSRF token from the page meta tag.
 */
export async function getCsrfToken(page: Page): Promise<string> {
  const token = page.locator('meta[name="csrf-token"]')
  return (await token.getAttribute('content')) ?? ''
}
