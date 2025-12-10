import { test, expect } from '@playwright/test'

import { ensurePersonaSession } from '../../shared/e2e/fixtures/auth_personas.js'
import { createProject, getCsrfToken, login } from '../../shared/e2e/helpers.js'
import { seedProjectMemberFlow } from '../../shared/e2e/support/seeded_project_member_flow.js'

const E2E_USER = 'tranngocduyet31@gmail.com'
const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

test.describe('Org Project Detail Split', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, E2E_USER)
  })

  test('uses sidebar-only project navigation inside the org shell', async ({ page }) => {
    await createProject(page, 'E2E Project Split')

    await expect(page.getByRole('tab')).toHaveCount(0)
    await expect(page.getByRole('main').getByText(/^Org project detail$/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Thông tin dự án$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Review Governance$/i })).toHaveCount(0)
  })

  test('project sidebar focus shows only selected project section active', async ({ page }) => {
    const seeded = await seedProjectMemberFlow(page)
    await ensurePersonaSession(page, seeded.ownerEmail, seeded.organizationId)
    await page.goto('/org/projects')
    await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
    const switchResponse = await page.request.post(`${BASE_URL}/switch-project`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': await getCsrfToken(page),
      },
      data: {
        project_id: seeded.projectId,
      },
    })
    expect(switchResponse.ok()).toBe(true)

    await page.goto(`/org/projects/${seeded.projectId}`)
    await page.waitForLoadState('networkidle')

    let projectNavigation = page
      .getByRole('navigation')
      .filter({ has: page.getByRole('button', { name: /Project hiện tại/i }) })
    let operatingModelSidebarButton = projectNavigation.getByRole('button', { name: /Operating model/i })

    if (await operatingModelSidebarButton.count() === 0) {
      await projectNavigation.getByRole('button', { name: /Project hiện tại/i }).click()
      operatingModelSidebarButton = projectNavigation.getByRole('button', { name: /Operating model/i })
    }
    await expect(
      projectNavigation.getByRole('button', { name: /Vai trò project & phân công/i })
    ).toBeVisible()
    await expect(projectNavigation.getByRole('button', { name: /Review project/i })).toHaveCount(0)

    await operatingModelSidebarButton.scrollIntoViewIfNeeded()
    await operatingModelSidebarButton.click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(new RegExp(`/org/projects/${seeded.projectId}\\?focus=operating_model$`))

    projectNavigation = page
      .getByRole('navigation')
      .filter({ has: page.getByRole('button', { name: /Project hiện tại/i }) })

    await expect(
      projectNavigation.getByRole('button', { name: /Tổng quan project/i })
    ).not.toHaveAttribute('aria-current', 'page')
    await expect(
      projectNavigation.getByRole('button', { name: /Operating model/i })
    ).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('main').getByText(/^Org project detail$/i)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /^Review Governance$/i })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /^Operating Model$/i })).toBeVisible()

    await page.goto(`/org/projects/${seeded.projectId}`)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /Thành viên project/i }).click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(new RegExp(`/org/projects/${seeded.projectId}\\?focus=members$`))

    projectNavigation = page
      .getByRole('navigation')
      .filter({ has: page.getByRole('button', { name: /Project hiện tại/i }) })

    await expect(
      projectNavigation.getByRole('button', { name: /Tổng quan project/i })
    ).not.toHaveAttribute('aria-current', 'page')
    await expect(
      projectNavigation.getByRole('button', { name: /Thành viên project/i })
    ).toHaveAttribute('aria-current', 'page')

    await expect(page.getByRole('heading', { name: /^Review Governance$/i })).toHaveCount(0)
    await expect(page.getByRole('main').getByText(/^Org project detail$/i)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /^Thành viên$/i })).toBeVisible()
    await expect(page.getByRole('main').getByText(seeded.ownerEmail)).toBeVisible()

    await page.getByRole('button', { name: /Operating model/i }).click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(new RegExp(`/org/projects/${seeded.projectId}\\?focus=operating_model$`))
    await expect(
      projectNavigation.getByRole('button', { name: /Tổng quan project/i })
    ).not.toHaveAttribute('aria-current', 'page')
    await expect(
      projectNavigation.getByRole('button', { name: /Operating model/i })
    ).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('heading', { name: /^Operating Model$/i })).toBeVisible()
  })
})
