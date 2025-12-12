import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

interface SeededOrgTaskScopeContext {
  organizationId: string
  ownerEmail: string
  projectId: string
  projectName: string
  secondProjectId: string
  secondProjectName: string
  projectTaskId: string
  projectTaskTitle: string
  secondProjectTaskId: string
  secondProjectTaskTitle: string
}

async function seedOrgTaskScope(page: Page): Promise<SeededOrgTaskScopeContext> {
  await page.goto('/organizations')
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  const response = await page.request.post(`${BASE}/api/testing/seed-task-create-flow`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': csrfToken ?? '',
    },
    data: {
      timestamp: Date.now(),
      nonce: Math.random().toString(36).slice(2, 10),
      withSecondProjectTask: true,
    },
  })

  expect(response.status()).toBe(200)
  const body = (await response.json()) as { data: SeededOrgTaskScopeContext }
  return body.data
}

test.describe('Organization task scope E2E', () => {
  test('org-wide task list still shows other project tasks after switching current project', async ({
    page,
  }) => {
    await login(page, 'tranngocduyet31@gmail.com')
    const seeded = await seedOrgTaskScope(page)

    await page.context().clearCookies()
    await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
    await page.goto('/org/tasks/list')
    await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
    const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
    const switchResponse = await page.request.post(`${BASE}/switch-project`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfToken ?? '',
      },
      data: {
        project_id: seeded.projectId,
      },
    })
    expect(switchResponse.ok()).toBe(true)

    await page.goto('/org/tasks/list?scope=organization')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText(seeded.projectTaskTitle).first()).toBeVisible()
    await expect(page.getByText(seeded.secondProjectTaskTitle).first()).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Server Error')
    await expect(page.locator('body')).not.toContainText('500')
  })
})
