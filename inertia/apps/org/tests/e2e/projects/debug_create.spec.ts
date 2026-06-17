import { test, expect } from '@playwright/test'

import { createProject, login } from '../../shared/e2e/helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Debug', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('debug: create project via API', async ({ page }) => {
    const projectId = await createProject(page, 'E2E Debug Test')
    console.warn('Project ID:', projectId)
    expect(projectId).toBeTruthy()
  })
})
