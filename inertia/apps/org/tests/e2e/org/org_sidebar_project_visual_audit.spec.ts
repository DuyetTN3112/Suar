import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { createProject, login } from '../../shared/e2e/helpers.js'

const E2E_ORG_OWNER = 'tranngocduyet31@gmail.com'
const SCREENSHOT_DIR = resolve('test-results/e2e-visual/org-sidebar-project-audit')
const UUID_RE = /^[0-9a-f-]{36}$/i

async function authFromCurrentPage(page: Page) {
  const dataPage = await page.locator('#app').getAttribute('data-page')
  expect(dataPage).not.toBeNull()
  const pageData = JSON.parse(dataPage ?? '{}') as {
    props?: {
      auth?: {
        user?: {
          current_organization_id?: string | null
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

  if (auth?.current_organization_id === ownerOrgId) {
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

async function openMobileNavigation(page: Page) {
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.locator('aside.open')).toBeVisible()
  await expect
    .poll(async () => page.locator('aside').evaluate((node) => Math.round(node.getBoundingClientRect().left)))
    .toBe(0)
}

async function expandSidebar(page: Page) {
  const sidebar = page.locator('aside').filter({ hasText: 'SUAR ORG' }).locator('nav').first()
  await expect(sidebar).toBeVisible()

  for (let pass = 0; pass < 20; pass += 1) {
    const toggles = sidebar.locator('button[aria-expanded="false"]')
    const count = await toggles.count()
    if (count === 0) break

    const toggle = toggles.first()
    await toggle.scrollIntoViewIfNeeded()
    if (await toggle.isVisible()) {
      await toggle.click()
    }
  }
}

async function capture(page: Page, name: string) {
  await page.waitForLoadState('networkidle')
  await expandSidebar(page)
  await scrollSidebarNavigation(page, 'top')
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}.png`,
    fullPage: true,
  })
}

async function captureContent(page: Page, name: string) {
  await page.waitForLoadState('networkidle')
  await expectNoHorizontalOverflow(page)
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}.png`,
    fullPage: true,
  })
}

async function captureMobileSidebar(page: Page, name: string) {
  await page.waitForLoadState('networkidle')
  await openMobileNavigation(page)
  await expandSidebar(page)
  await scrollSidebarNavigation(page, 'top')
  await expectNoHorizontalOverflow(page)
  const sidebarBox = await page.locator('aside.open').boundingBox()
  expect(Math.round(sidebarBox?.x ?? -1)).toBe(0)
  expect(Math.round(sidebarBox?.width ?? 9999)).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0)
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}.png`,
    fullPage: true,
  })
}

async function captureSidebarBottom(page: Page, name: string) {
  await page.waitForLoadState('networkidle')
  await expandSidebar(page)
  await scrollSidebarNavigation(page, 'bottom')
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}.png`,
    fullPage: true,
  })
}

async function scrollSidebarNavigation(page: Page, edge: 'top' | 'bottom') {
  const sidebarNav = page.locator('aside').filter({ hasText: 'SUAR ORG' }).locator('nav').first()
  await sidebarNav.evaluate((node, targetEdge) => {
    node.scrollTop = targetEdge === 'top' ? 0 : node.scrollHeight
  }, edge)
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        bodyWidth: document.body.scrollWidth,
        documentWidth: document.documentElement.scrollWidth,
      }))
    )
    .toEqual(
      expect.objectContaining({
        viewportWidth: expect.any(Number),
      })
    )

  const widths = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
  }))
  const offenders = await page.evaluate(() =>
    Array.from(document.querySelectorAll('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName.toLowerCase(),
          className: element.getAttribute('class'),
          text: element.textContent.trim().slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        }
      })
      .filter((entry) => entry.right > window.innerWidth + 1)
      .slice(0, 8)
  )

  expect(
    Math.max(widths.bodyWidth, widths.documentWidth),
    JSON.stringify({ widths, offenders }, null, 2)
  ).toBeLessThanOrEqual(widths.viewportWidth + 1)
}

test.describe('Org sidebar and project visual audit', () => {
  test.beforeAll(() => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true })
  })

  test.beforeEach(async ({ page }) => {
    await login(page, E2E_ORG_OWNER)
    await switchToOwnerOrganization(page)
  })

  test('captures desktop org sidebar and project management screens', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1440, height: 1100 })

    const projectId = await createProject(page, `Visual Audit Project ${Date.now()}`, {
      navigate: false,
    })
    expect(projectId).toMatch(UUID_RE)

    await page.goto('/org')
    await expectNoHorizontalOverflow(page)
    await capture(page, 'desktop-01-org-home-sidebar')
    await captureSidebarBottom(page, 'desktop-01b-org-sidebar-bottom')

    await page.goto('/org/projects')
    await captureContent(page, 'desktop-02-project-list')

    await page.goto('/org/projects/create')
    await expect(page.getByText('SUAR ORG')).toBeVisible()
    await expect(page.getByText('User mode')).toHaveCount(0)
    await captureContent(page, 'desktop-02b-project-create')

    await page.goto(`/org/projects/${projectId}`)
    await captureContent(page, 'desktop-03-project-detail-overview')

    await page.goto(`/org/projects/${projectId}?focus=members`)
    await captureContent(page, 'desktop-04-project-detail-members')

    await page.goto(`/org/projects/${projectId}?focus=skills`)
    await captureContent(page, 'desktop-05-project-detail-skills')

    await page.goto(`/org/projects/${projectId}?focus=roles`)
    await captureContent(page, 'desktop-06-project-detail-roles')

    await page.goto(`/org/projects/${projectId}?focus=operating_model`)
    await captureContent(page, 'desktop-07-project-detail-operating-model')

    await page.goto(`/org/sprints?projectId=${projectId}`)
    await captureContent(page, 'desktop-08-sprints-current-project')
  })

  test('captures mobile org sidebar and project management screens', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 390, height: 844 })

    const projectId = await createProject(page, `Mobile Visual Audit Project ${Date.now()}`, {
      navigate: false,
    })
    expect(projectId).toMatch(UUID_RE)

    await page.goto('/org')
    await captureMobileSidebar(page, 'mobile-01-org-home-sidebar-open')
    await captureSidebarBottom(page, 'mobile-01b-org-sidebar-bottom-open')

    await page.goto('/org/projects')
    await captureContent(page, 'mobile-02-project-list')

    await page.goto('/org/projects/create')
    await expect(page.getByText('SUAR ORG')).toBeVisible()
    await expect(page.getByText('User mode')).toHaveCount(0)
    await captureContent(page, 'mobile-02b-project-create')

    await page.goto(`/org/projects/${projectId}`)
    await captureContent(page, 'mobile-03-project-detail-overview')
  })
})
