import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { test, expect, type Page } from '@playwright/test'

import { getCsrfToken, login } from '../../shared/e2e/helpers.js'

const E2E_ORG_OWNER = 'tranngocduyet31@gmail.com'
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/org-workspace')
const UUID_RE = /^[0-9a-f-]{36}$/i

interface SeedProjectContext {
  organizationId: string
  projectId: string
  ownerEmail: string
}

interface SeedProjectResponse {
  data: SeedProjectContext
}

const orgRoutes = [
  { path: '/org', heading: /Tổng quan tổ chức/i },
  { path: '/org/members', heading: /Thành viên tổ chức/i },
  { path: '/org/projects', heading: /Danh mục dự án/i },
  { path: '/org/tasks/board', ariaLabel: 'Board task tổ chức' },
  { path: '/org/tasks/list', ariaLabel: 'Danh sách task tổ chức' },
  { path: '/org/tasks/workflow', heading: /Workflow task/i },
  { path: '/org/talents', heading: /Danh bạ Talent Tổ chức/i },
  { path: '/marketplace/talents', heading: /Danh bạ Talent Tổ chức/i },
  { path: '/marketplace/bookmarks', heading: /Talent đã lưu/i },
  { path: '/org/marketplace/tasks', heading: /Thị trường task/i },
  { path: '/org/reviews/task-board', heading: /Task review board/i },
  { path: '/org/reviews/sprint-reverse-board?review_type=manager', heading: /Review quản lý/i },
  { path: '/org/reviews/sprint-reverse-board?review_type=environment', heading: /Review môi trường làm việc/i },
  { path: '/org/disputes', heading: /Hàng đợi khiếu nại đánh giá/i },
  { path: '/org/reverse-reviews', heading: /Lịch sử review môi trường/i },
] as const

async function gotoRoute(page: Page, path: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      break
    } catch (error) {
      const message = String(error)
      if (!message.includes('net::ERR_ABORTED') || attempt === 1) {
        throw error
      }
    }
  }

  await page.waitForLoadState('networkidle')
}

async function authFromCurrentPage(page: Page) {
  const dataPage = await page.locator('#app').getAttribute('data-page')
  expect(dataPage).not.toBeNull()
  const pageData = JSON.parse(dataPage ?? '{}') as {
    props?: {
      auth?: {
        user?: {
          current_organization_id?: string | null
          current_organization_role?: string | null
          organizations?: { id: string; name: string; org_role?: string | null }[]
        } | null
      }
    }
  }

  return pageData.props?.auth?.user ?? null
}

async function switchToOwnerOrganization(page: Page) {
  await page.goto('/tasks')
  await page.waitForLoadState('networkidle')

  const auth = await authFromCurrentPage(page)
  const ownerOrg =
    auth?.organizations?.find(
      (org) => org.org_role === 'org_owner' && /suar\s+workspace/i.test(org.name)
    ) ??
    auth?.organizations?.find((org) => /suar\s+workspace/i.test(org.name)) ??
    auth?.organizations?.find((org) => org.org_role === 'org_owner') ??
    auth?.organizations?.find((org) => org.org_role === 'org_admin') ??
    auth?.organizations?.[0]
  const ownerOrgId = ownerOrg?.id ?? ''
  expect(ownerOrgId).toMatch(UUID_RE)

  if (
    auth?.current_organization_id === ownerOrgId &&
    auth.current_organization_role === 'org_owner'
  ) {
    return
  }

  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  expect(csrfToken ?? '').toMatch(/\S+/)
  const response = await page.request.post('/switch-organization', {
    headers: {
      'x-csrf-token': csrfToken ?? '',
    },
    data: {
      organizationId: ownerOrgId,
      currentPath: '/tasks',
    },
  })

  expect(response.ok()).toBe(true)
}

async function switchToProject(page: import('@playwright/test').Page, projectId: string) {
  await page.goto('/org/projects')
  await page.waitForLoadState('networkidle')

  const csrfToken = await getCsrfToken(page)
  const response = await page.request.post('/switch-project', {
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

  expect(response.ok()).toBe(true)
}

async function seedProjectContext(
  page: import('@playwright/test').Page,
  label: string
): Promise<SeedProjectContext> {
  const response = await page.request.post('/api/testing/seed-task-create-flow', {
    data: {
      timestamp: Date.now(),
      nonce: `${label}-${Math.random().toString(36).slice(2, 8)}`,
    },
  })
  expect(response.ok()).toBe(true)

  const body = (await response.json()) as SeedProjectResponse
  expect(body.data.organizationId).toMatch(UUID_RE)
  expect(body.data.projectId).toMatch(UUID_RE)
  return body.data
}

async function expectTaskSizedReviewKanban(page: Page) {
  const kanban = page.getByRole('region', { name: 'Kanban trạng thái' })
  const scroller = kanban.locator(':scope > div').first()
  const firstLane = kanban.locator(':scope > div > section').first()
  const metrics = await scroller.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
  }))
  const box = await firstLane.boundingBox()

  await expect(kanban).toBeVisible()
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth)
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(300)
  expect(box?.width ?? 0).toBeLessThanOrEqual(340)
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(420)
}

test.describe('Org Workspace Navigation Smoke', () => {
  test.beforeAll(() => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true })
  })

  test.beforeEach(async ({ page }) => {
    await login(page, E2E_ORG_OWNER)
    await switchToOwnerOrganization(page)
  })

  test('org sidebar exposes management domains and canonical workflow entry', async ({ page }) => {
    await page.goto('/org')
    await page.waitForLoadState('networkidle')

    const sidebarNav = page.locator('aside nav')

    await expect(sidebarNav.getByText('Quản lý tổ chức', { exact: true })).toBeVisible()
    await expect(sidebarNav.getByText('Quản lý project', { exact: true })).toBeVisible()
    await expect(sidebarNav.getByText('Quản lý sprint', { exact: true })).toBeVisible()
    await expect(sidebarNav.getByText('Quản lý task', { exact: true })).toBeVisible()
    await expect(sidebarNav.getByText('Chất lượng', { exact: true })).toHaveCount(0)
    await expect(sidebarNav.getByText('Tuyển dụng & Nguồn lực', { exact: true })).toHaveCount(0)
    await expect(sidebarNav.getByText('Cài Đặt', { exact: true })).toHaveCount(0)

    const seeded = await seedProjectContext(page, 'review-nav')
    await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
    await switchToProject(page, seeded.projectId)
    await page.setViewportSize({ width: 1280, height: 1080 })
    await page.goto(`/org/projects/${seeded.projectId}?focus=sprints`)
    await page.waitForLoadState('networkidle')

    const projectSprintSidebarNav = page.locator('aside nav')
    await expect(
      projectSprintSidebarNav.getByRole('button', { name: /^Sprint của project$/ })
    ).toHaveCount(1)
    await expect(
      projectSprintSidebarNav.getByRole('button', { name: /Sprint project:/i })
    ).toHaveCount(0)
    await projectSprintSidebarNav.evaluate((node) => {
      node.scrollTop = 360
    })
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/project-sprint-sidebar-no-duplicate.png`,
      fullPage: true,
    })

    await page.goto('/org')
    await page.waitForLoadState('networkidle')

    const refreshedSidebarNav = page.locator('aside nav')
    await refreshedSidebarNav.getByRole('button', { name: /Review sau sprint/i }).click()
    await expect(refreshedSidebarNav.getByRole('button', { name: /Review quản lý/i })).toBeVisible()
    await expect(refreshedSidebarNav.getByRole('button', { name: /Review môi trường làm việc/i })).toBeVisible()
    await expect(refreshedSidebarNav.getByRole('button', { name: /Lịch sử review môi trường/i })).toHaveCount(0)
    await expect(refreshedSidebarNav.getByRole('button', { name: /Tranh chấp review/i })).toHaveCount(0)
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/review-after-sprint-sidebar-only-boards.png`,
      fullPage: true,
    })

    await refreshedSidebarNav.getByRole('button', { name: /Điều phối task/i }).click()
    await expect(refreshedSidebarNav.getByRole('button', { name: /Board task/i })).toBeVisible()
    await expect(refreshedSidebarNav.getByRole('button', { name: /Danh sách task/i })).toBeVisible()
    await expect(refreshedSidebarNav.getByRole('button', { name: /Workflow task/i })).toBeVisible()
    await expect(refreshedSidebarNav.getByText('Công Việc', { exact: true })).toHaveCount(0)
  })

  test('org marketplace sidebar entry stays in organization shell', async ({ page }) => {
    const seeded = await seedProjectContext(page, 'marketplace-nav')
    await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
    await switchToProject(page, seeded.projectId)

    await page.goto('/org')
    await page.waitForLoadState('networkidle')

    const sidebarNav = page.locator('aside nav')
    await sidebarNav.getByRole('button', { name: /Nguồn task mở/i }).click()

    await expect(page).toHaveURL(/\/org\/marketplace\/tasks/)
    await expect(page.getByRole('heading', { level: 1, name: /Thị trường task/i })).toBeVisible()
    await expect(page.locator('aside').getByText('SUAR ORG', { exact: true })).toBeVisible()
    await expect(page.locator('aside').getByText('User mode', { exact: true })).toHaveCount(0)
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/marketplace-sidebar-org-shell.png`,
      fullPage: true,
    })
  })

  test('org review board sidebar entries stay in organization shell', async ({ page }) => {
    const seeded = await seedProjectContext(page, 'review-board-nav')
    await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
    await switchToProject(page, seeded.projectId)

    await page.goto('/org')
    await page.waitForLoadState('networkidle')

    const sidebarNav = page.locator('aside nav')
    await sidebarNav.getByRole('button', { name: /Review task/i }).click()
    await sidebarNav.getByRole('button', { name: /Task review board/i }).click()

    await expect(page).toHaveURL(/\/org\/reviews\/task-board/)
    await expect(page.getByRole('heading', { level: 1, name: /Task review board/i })).toBeVisible()
    await expect(page.locator('aside').getByText('SUAR ORG', { exact: true })).toBeVisible()
    await expect(page.locator('aside').getByText('User mode', { exact: true })).toHaveCount(0)
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/task-review-board-org-shell.png`,
      fullPage: true,
    })

    await page.goto('/org/reviews/sprint-reverse-board?review_type=manager')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/org\/reviews\/sprint-reverse-board\?review_type=manager/)
    await expect(page.getByRole('heading', { level: 1, name: /Review quản lý/i })).toBeVisible()
    await expect(page.getByText(/sếp trực tiếp|người giao việc/i)).toHaveCount(0)
    await expectTaskSizedReviewKanban(page)
    await expect(page.locator('aside').getByText('SUAR ORG', { exact: true })).toBeVisible()
    await expect(page.locator('aside').getByText('User mode', { exact: true })).toHaveCount(0)
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/manager-review-board-org-shell.png`,
      fullPage: true,
    })

    await page.goto('/org/reviews/sprint-reverse-board?review_type=environment')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/org\/reviews\/sprint-reverse-board\?review_type=environment/)
    await expect(page.getByRole('heading', { level: 1, name: /Review môi trường làm việc/i })).toBeVisible()
    await expect(page.getByText(/Review môi trường project, tổ chức/i)).toHaveCount(0)
    await expectTaskSizedReviewKanban(page)
    await expect(page.locator('aside').getByText('SUAR ORG', { exact: true })).toBeVisible()
    await expect(page.locator('aside').getByText('User mode', { exact: true })).toHaveCount(0)
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/work-environment-review-board-org-shell.png`,
      fullPage: true,
    })
  })

  test('org dispute queue route stays direct-only outside review board navigation', async ({ page }) => {
    const seeded = await seedProjectContext(page, 'review-disputes-nav')
    await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
    await switchToProject(page, seeded.projectId)

    await page.goto('/org/disputes')
    await page.waitForLoadState('networkidle')

    const sidebarNav = page.locator('aside nav')
    await expect(page.getByRole('heading', { level: 1, name: /Hàng đợi khiếu nại đánh giá/i })).toBeVisible()
    await expect(sidebarNav.getByRole('button', { name: /Tranh chấp sprint review/i })).toHaveCount(0)
    await expect(sidebarNav.getByRole('button', { name: /Tranh chấp review/i })).toHaveCount(0)
    await expect(sidebarNav.locator('button[aria-current="page"]')).toHaveCount(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/org-review-disputes-direct-only.png`,
      fullPage: true,
    })
  })

  test('org reverse review history route stays direct-only outside review board navigation', async ({ page }) => {
    const seeded = await seedProjectContext(page, 'reverse-reviews-nav')
    await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
    await switchToProject(page, seeded.projectId)

    await page.goto('/org/reverse-reviews')
    await page.waitForLoadState('networkidle')

    const sidebarNav = page.locator('aside nav')
    await expect(page.getByRole('heading', { level: 1, name: /Lịch sử review môi trường/i })).toBeVisible()
    await expect(sidebarNav.getByRole('button', { name: /Lịch sử review môi trường/i })).toHaveCount(0)
    await expect(sidebarNav.locator('button[aria-current="page"]')).toHaveCount(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/org-reverse-reviews-direct-only.png`,
      fullPage: true,
    })
  })

  for (const route of orgRoutes) {
    test(`renders ${route.path}`, async ({ page }) => {
      await gotoRoute(page, route.path)

      if ('heading' in route) {
        await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
        return
      }

      await expect(page.locator(`section[aria-label="${route.ariaLabel}"]`)).toBeVisible()
    })
  }
})
