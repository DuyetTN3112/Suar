import { expect, test } from '@playwright/test'

import { createProject, getCsrfToken, login } from '../../shared/e2e/helpers.js'

const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const E2E_ORG_OWNER = 'tranngocduyet31@gmail.com'

test.describe('Org Task Scope Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_ORG_OWNER)
  })

  test('org task board defaults to project scope and can switch to org-wide scope', async ({ page }) => {
    const projectId = await createProject(page, `Org Task Scope ${Date.now()}`, { navigate: false })

    await page.goto('/org/projects')
    await page.waitForLoadState('networkidle')

    const csrfToken = await getCsrfToken(page)
    const switchResponse = await page.request.post(`${BASE_URL}/switch-project`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfToken,
      },
      data: {
        project_id: projectId,
      },
    })

    expect(switchResponse.ok()).toBeTruthy()

    await page.goto('/org/tasks/board')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/org\/tasks\/board(?:\?.*)?$/)
    await expect(page).not.toHaveURL(/project_id=/)
    const taskBoard = page.getByRole('region', { name: 'Board task tổ chức' })
    await expect(taskBoard).toBeVisible()
    await expect(taskBoard.getByRole('button', { name: 'Trạng thái', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Thêm trạng thái mới' })).toBeVisible()
    await expect(page.getByRole('group', { name: /phạm vi task/i })).toHaveCount(0)
  })

  test('project scoped task board does not activate sprint backlog navigation', async ({ page }) => {
    const projectId = await createProject(page, `Sprint Task Nav ${Date.now()}`, { navigate: false })

    await page.goto('/org/projects')
    await page.waitForLoadState('networkidle')

    const csrfToken = await getCsrfToken(page)
    const switchResponse = await page.request.post(`${BASE_URL}/switch-project`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfToken,
      },
      data: {
        project_id: projectId,
      },
    })

    expect(switchResponse.ok()).toBeTruthy()

    await page.goto(`/org/tasks/board?project_id=${projectId}`)
    await page.waitForLoadState('networkidle')

    const sidebarNav = page.locator('aside nav')
    await expect(sidebarNav.getByRole('button', { name: /Board backlog project/i })).toHaveCount(0)
    await expect(sidebarNav.locator('button[aria-current="page"]')).toHaveText(['Board task'])
  })
})
