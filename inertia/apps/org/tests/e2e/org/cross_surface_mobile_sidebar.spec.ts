import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const REGULAR_USER = 'tranngocduyet31@gmail.com'
const ADMIN_USER = 'td6622i@gre.ac.uk'
const UUID_RE = /^[0-9a-f-]{36}$/i

async function currentAuth(page: Page) {
  const dataPage = await page.locator('#app').getAttribute('data-page')
  expect(dataPage).not.toBeNull()
  const pageData = JSON.parse(dataPage ?? '{}') as {
    props?: {
      auth?: {
        user?: {
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

  const auth = await currentAuth(page)
  const organization =
    auth?.organizations?.find((org) => org.org_role === 'org_owner') ??
    auth?.organizations?.find((org) => org.org_role === 'org_admin') ??
    auth?.organizations?.[0]
  const organizationId = organization?.id ?? ''
  expect(organizationId).toMatch(UUID_RE)

  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  expect(csrfToken ?? '').toMatch(/\S+/)
  const response = await page.request.post('/switch-organization', {
    headers: {
      'x-csrf-token': csrfToken ?? '',
    },
    data: {
      organizationId,
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

test.describe('Cross-surface mobile sidebar', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true })

  test('user shell opens the member workspace navigation', async ({ page }) => {
    await login(page, REGULAR_USER, { systemRole: 'registered_user' })
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')

    await openMobileNavigation(page)

    await expect(page.getByRole('heading', { level: 1, name: 'Quản lý nhiệm vụ' })).toBeAttached()
    await expect(page.locator('aside')).toContainText('SUAR')
    await expect(page.locator('aside')).not.toContainText('SUAR ORG')
  })

  test('org shell opens owner/admin organization navigation', async ({ page }) => {
    await login(page, REGULAR_USER, { systemRole: 'registered_user' })
    await switchToOwnerOrganization(page)
    await page.goto('/org')
    await page.waitForLoadState('networkidle')

    await openMobileNavigation(page)

    await expect(page.getByRole('heading', { level: 1, name: /Tổng quan tổ chức/i })).toBeVisible()
    await expect(page.locator('aside')).toContainText('SUAR ORG')
    await expect(page.locator('aside nav')).toContainText('Quản lý tổ chức')
  })

  test('admin shell opens system administration navigation', async ({ page }) => {
    await login(page, ADMIN_USER, { systemRole: 'superadmin' })
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    await openMobileNavigation(page)

    await expect(page.getByRole('heading', { level: 1, name: /Bảng điều khiển hệ thống/i })).toBeVisible()
    await expect(page.locator('aside')).toContainText('SUAR ADMIN')
    await expect(page.locator('aside nav')).toContainText('Access control')
  })
})
