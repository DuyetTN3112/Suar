import { expect, test } from '@playwright/test'

import { createProject, login } from '../../shared/e2e/helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'

test.describe('Org Project Portfolio Split', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('separates project detail from task workspace entry on org portfolio cards', async ({ page }) => {
    await createProject(page, `E2E Portfolio Split ${Date.now()}`, { navigate: false })

    await page.goto('/org/projects')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Danh mục dự án' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Xem chi tiết project' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mở task của dự án' }).first()).toBeVisible()
  })
})
