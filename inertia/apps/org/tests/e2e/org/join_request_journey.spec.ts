import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const E2E_USER = 'tranngocduyet31@gmail.com'

interface SeededOrganizationJoinRequestContext {
  requesterEmail: string
  requesterWorkspaceId: string
  requesterId: string
  targetOrganizationId: string
  targetOrganizationName: string
  ownerEmail: string
  pendingAdminEmail?: string
  pendingAdminId?: string
  timestamp: number
}

function isSuccessfulMutation(status: number): boolean {
  return [200, 204, 303].includes(status)
}

async function seedOrganizationJoinRequestFlow(
  page: Page,
  options: { withPendingJoinRequest?: boolean; withPendingAdmin?: boolean } = {}
): Promise<SeededOrganizationJoinRequestContext> {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 10)
  await page.goto('/organizations')
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  const response = await page.request.post(`${BASE}/api/testing/seed-organization-join-request-flow`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': csrfToken ?? '',
    },
    data: {
      timestamp,
      nonce,
      withPendingJoinRequest: options.withPendingJoinRequest ?? false,
      withPendingAdmin: options.withPendingAdmin ?? false,
    },
  })

  expect(response.status()).toBe(200)
  const body = (await response.json()) as { data: SeededOrganizationJoinRequestContext }
  return body.data
}

test.describe('Organization join request journey E2E', () => {
  test('non-member requests to join an organization and sees pending state', async ({ page }) => {
    await login(page, E2E_USER)
    const seeded = await seedOrganizationJoinRequestFlow(page)

    try {
      await page.context().clearCookies()
      await login(page, seeded.requesterEmail, { organizationId: seeded.requesterWorkspaceId })
      await page.goto('/organizations?tab=available')
      await page.waitForLoadState('domcontentloaded')

      const orgCard = page.getByRole('article').filter({ hasText: seeded.targetOrganizationName })
      await expect(orgCard).toBeVisible()
      await expect(orgCard.getByRole('button', { name: 'Tham gia' })).toBeVisible()

      const [joinResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/organizations/${seeded.targetOrganizationId}/join`)
        ),
        orgCard.getByRole('button', { name: 'Tham gia' }).click(),
      ])
      expect([200, 204]).toContain(joinResponse.status())

      await expect(orgCard.getByRole('button', { name: 'Đang chờ duyệt' })).toBeVisible()
    } finally {
      await page.context().clearCookies()
    }
  })

  test('owner approves a pending join request from the organization requests page', async ({
    page,
  }) => {
    await login(page, E2E_USER)
    const seeded = await seedOrganizationJoinRequestFlow(page, { withPendingJoinRequest: true })

    try {
      await page.context().clearCookies()
      await login(page, seeded.ownerEmail, { organizationId: seeded.targetOrganizationId })
      await page.goto('/org/invitations/requests')
      await page.waitForLoadState('domcontentloaded')

      const requestRow = page.getByRole('article').filter({ hasText: seeded.requesterEmail })
      await expect(requestRow).toBeVisible()

      const [approveResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/org/invitations/requests/${seeded.requesterId}/approve`)
        ),
        requestRow.getByRole('button', { name: /^Duyệt$/ }).click(),
      ])
      expect(isSuccessfulMutation(approveResponse.status())).toBe(true)

      await expect(page.getByText(seeded.requesterEmail)).toHaveCount(0)
      await expect(page.getByText('Không có yêu cầu đang chờ.')).toBeVisible()
    } finally {
      await page.context().clearCookies()
    }
  })

  test('owner rejects a pending join request from the organization requests page', async ({
    page,
  }) => {
    await login(page, E2E_USER)
    const seeded = await seedOrganizationJoinRequestFlow(page, { withPendingJoinRequest: true })

    try {
      await page.context().clearCookies()
      await login(page, seeded.ownerEmail, { organizationId: seeded.targetOrganizationId })
      await page.goto('/org/invitations/requests')
      await page.waitForLoadState('domcontentloaded')

      const requestRow = page.getByRole('article').filter({ hasText: seeded.requesterEmail })
      await expect(requestRow).toBeVisible()

      const [rejectResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/org/invitations/requests/${seeded.requesterId}/approve`)
        ),
        requestRow.getByRole('button', { name: /^Từ chối$/ }).click(),
      ])
      expect(isSuccessfulMutation(rejectResponse.status())).toBe(true)

      await expect(page.getByText(seeded.requesterEmail)).toHaveCount(0)
      await expect(page.getByText('Không có yêu cầu đang chờ.')).toBeVisible()
    } finally {
      await page.context().clearCookies()
    }
  })

  test('non-owner cannot process a foreign pending join request', async ({ page }) => {
    await login(page, E2E_USER)
    const seeded = await seedOrganizationJoinRequestFlow(page, { withPendingJoinRequest: true })

    try {
      await page.context().clearCookies()
      await login(page, seeded.requesterEmail, { organizationId: seeded.requesterWorkspaceId })
      await page.goto('/organizations')
      await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
      const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
      const forbiddenResponse = await page.request.put(
        `${BASE}/org/invitations/requests/${seeded.requesterId}/approve`,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': csrfToken ?? '',
          },
          data: { action: 'approve' },
        }
      )
      expect([403, 404, 422]).toContain(forbiddenResponse.status())

      await page.context().clearCookies()
      await login(page, seeded.ownerEmail, { organizationId: seeded.targetOrganizationId })
      await page.goto('/org/invitations/requests')
      await page.waitForLoadState('domcontentloaded')

      const requestRow = page.getByRole('article').filter({ hasText: seeded.requesterEmail })
      await expect(requestRow).toBeVisible()
      await expect(requestRow.getByRole('button', { name: 'Duyệt' })).toBeVisible()
    } finally {
      await page.context().clearCookies()
    }
  })

  test('pending admin cannot process a pending join request', async ({ page }) => {
    await login(page, E2E_USER)
    const seeded = await seedOrganizationJoinRequestFlow(page, {
      withPendingJoinRequest: true,
      withPendingAdmin: true,
    })
    expect(typeof seeded.pendingAdminEmail).toBe('string')
    expect(seeded.pendingAdminEmail?.length).toBeGreaterThan(0)
    if (typeof seeded.pendingAdminEmail !== 'string') {
      throw new Error('Expected pending admin email')
    }

    try {
      const forbiddenLoginResponse = await page.request.post(`${BASE}/api/testing/token-login`, {
        form: {
          email: seeded.pendingAdminEmail,
          provider: 'google',
          organization_id: seeded.targetOrganizationId,
        },
      })
      expect([401, 403]).toContain(forbiddenLoginResponse.status())
      await expect(forbiddenLoginResponse).not.toBeOK()
      const denialBody = await forbiddenLoginResponse.text()
      expect(denialBody).toContain('not an approved member')

      await page.context().clearCookies()
      await login(page, seeded.ownerEmail, { organizationId: seeded.targetOrganizationId })
      await page.goto('/org/invitations/requests')
      await page.waitForLoadState('domcontentloaded')

      const requestRow = page.getByRole('article').filter({ hasText: seeded.requesterEmail })
      await expect(requestRow).toBeVisible()
      await expect(requestRow.getByRole('button', { name: 'Duyệt' })).toBeVisible()
    } finally {
      await page.context().clearCookies()
    }
  })
})
