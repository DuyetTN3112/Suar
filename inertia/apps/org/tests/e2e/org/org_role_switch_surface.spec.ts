import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const E2E_USER = 'tranngocduyet31@gmail.com'
const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const UUID_RE = /^[0-9a-f-]{36}$/i

interface SeededOrganizationInvitationContext {
  organizationId: string
  organizationName: string
  inviteeEmail: string
}

async function currentAuth(page: Page) {
  const dataPage = await page.locator('#app').getAttribute('data-page')
  expect(dataPage).not.toBeNull()
  const pageData = JSON.parse(dataPage ?? '{}') as {
    props?: {
      auth?: {
        user?: {
          current_organization_role?: string | null
          current_organization_id?: string | null
          organizations?: { id: string; name: string; org_role?: string | null }[]
        } | null
      }
    }
  }

  return pageData.props?.auth?.user ?? null
}

async function switchOrganizationByApi(page: Page, organizationId: string) {
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

async function seedAcceptedMemberOrganization(page: Page) {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 10)
  await page.goto('/organizations')
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  expect(csrfToken ?? '').toMatch(/\S+/)
  const response = await page.request.post(`${BASE}/api/testing/seed-organization-invitation-flow`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': csrfToken ?? '',
    },
    data: {
      timestamp,
      nonce,
      withPendingInvitation: true,
    },
  })
  expect(response.status()).toBe(200)
  const body = (await response.json()) as { data: SeededOrganizationInvitationContext }
  const seeded = body.data

  await page.context().clearCookies()
  await login(page, seeded.inviteeEmail)
  await page.goto('/profile/invitations')
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
  const inviteeCsrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  expect(inviteeCsrfToken ?? '').toMatch(/\S+/)
  const acceptResponse = await page.request.put(
    `${BASE}/api/v1/me/invitations/${seeded.organizationId}/accept`,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': inviteeCsrfToken ?? '',
      },
    }
  )
  expect([200, 204, 303]).toContain(acceptResponse.status())

  return seeded
}

test.describe('Organization role switch preserves correct surface', () => {
  test('member org stays on user shell and owner org moves into org shell', async ({ page }) => {
    await login(page, E2E_USER, { systemRole: 'registered_user' })
    const seeded = await seedAcceptedMemberOrganization(page)

    await page.context().clearCookies()
    await login(page, seeded.inviteeEmail)
    await page.goto('/tasks')
    await page.waitForLoadState('domcontentloaded')

    const initialAuth = await currentAuth(page)
    const ownerOrg = initialAuth?.organizations?.find((org) => org.org_role === 'org_owner')
    const memberOrg = initialAuth?.organizations?.find((org) => org.id === seeded.organizationId)
    const ownerOrgId = ownerOrg?.id ?? ''
    const memberOrgId = memberOrg?.id ?? ''
    expect(ownerOrgId).toMatch(UUID_RE)
    expect(memberOrgId).toMatch(UUID_RE)
    expect(memberOrg?.org_role).toBe('org_member')

    await switchOrganizationByApi(page, ownerOrgId)
    await page.goto('/tasks')
    await page.waitForLoadState('domcontentloaded')
    await expect.poll(async () => {
      const auth = await currentAuth(page)
      return auth?.current_organization_role
    }).toBe('org_owner')

    await switchOrganizationByApi(page, memberOrgId)
    await page.goto('/tasks')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/tasks$/)
    await expect(page.locator('aside')).toContainText('SUAR')
    await expect(page.locator('aside')).not.toContainText('SUAR ORG')
    await expect(page.locator('aside nav')).not.toContainText('Quản lý tổ chức')
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect.poll(async () => {
      const auth = await currentAuth(page)
      return auth?.current_organization_role
    }).toBe('org_member')

    await switchOrganizationByApi(page, ownerOrgId)
    await page.goto('/org')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/org$/)
    await expect(page.getByRole('heading', { level: 1, name: /Tổng quan tổ chức/i })).toBeVisible()
    await expect(page.locator('aside')).toContainText('SUAR ORG')
    await expect(page.locator('aside nav')).toContainText('Quản lý tổ chức')
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect.poll(async () => {
      const auth = await currentAuth(page)
      return auth?.current_organization_role
    }).toBe('org_owner')
  })
})
