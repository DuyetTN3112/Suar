import { test, expect, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const E2E_USER = 'tranngocduyet31@gmail.com'

interface SeededOrganizationInvitationContext {
  organizationId: string
  organizationName: string
  ownerEmail: string
  inviteeEmail: string
  foreignUserEmail?: string
  foreignWorkspaceId?: string
  ownerId: string
  inviteeId: string
  foreignUserId?: string
  timestamp: number
}

async function seedOrganizationInvitationFlow(
  page: Page,
  options: { withPendingInvitation?: boolean; withForeignUser?: boolean } = {}
): Promise<SeededOrganizationInvitationContext> {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 10)
  await page.goto('/organizations')
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
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
      withPendingInvitation: options.withPendingInvitation ?? false,
      withForeignUser: options.withForeignUser ?? false,
    },
  })

  expect(response.status()).toBe(200)
  const body = (await response.json()) as { data: SeededOrganizationInvitationContext }
  return body.data
}

test.describe('Organization invitation journey E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test('owner invites a user and invitee accepts into the organization shell', async ({ page }) => {
    await login(page, E2E_USER)
    const seeded = await seedOrganizationInvitationFlow(page)

    try {
      await page.context().clearCookies()
      await login(page, seeded.inviteeEmail)

      await page.context().clearCookies()
      await login(page, seeded.ownerEmail, { organizationId: seeded.organizationId })
      await page.goto('/org/invitations')
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByRole('heading', { name: 'Lời mời tổ chức' })).toBeVisible()
      await page.getByRole('button', { name: 'Mời thành viên' }).first().click()
      await page.getByLabel('Email').fill(seeded.inviteeEmail)
      const [inviteResponse] = await Promise.all([
        page.waitForResponse((response) => response.url().includes('/org/members/invite')),
        page.getByRole('button', { name: 'Gửi lời mời' }).click(),
      ])
      expect([200, 204]).toContain(inviteResponse.status())
      await expect(page.getByText(seeded.inviteeEmail)).toBeVisible()

      await page.context().clearCookies()
      await login(page, seeded.inviteeEmail)
      await page.goto('/profile/invitations')
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByRole('heading', { name: 'Lời mời tham gia tổ chức' })).toBeVisible()
      await expect(page.getByText(seeded.organizationName).first()).toBeVisible()
      const [acceptResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/api/v1/me/invitations/${seeded.organizationId}/accept`)
        ),
        page.getByRole('button', { name: 'Đồng ý' }).click(),
      ])
      expect([200, 204, 303]).toContain(acceptResponse.status())

      await page.context().clearCookies()
      await login(page, seeded.inviteeEmail, { organizationId: seeded.organizationId })
      await page.goto('/tasks')
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByText(seeded.organizationName).first()).toBeVisible()
      await expect(page.getByRole('region', { name: 'Quản lý nhiệm vụ' })).toBeVisible()
      await expect(page.locator('body')).not.toContainText('ForbiddenException')
      await expect(page.locator('text=500|Server Error|Lỗi hệ thống')).toHaveCount(0)
    } finally {
      await page.context().clearCookies()
    }
  })

  test('invitee rejects an invitation and loses the pending invite from inbox', async ({ page }) => {
    await login(page, E2E_USER)
    const seeded = await seedOrganizationInvitationFlow(page, { withPendingInvitation: true })

    try {
      await page.context().clearCookies()
      await login(page, seeded.inviteeEmail)
      await page.goto('/profile/invitations')
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByText(seeded.organizationName).first()).toBeVisible()
      const [rejectResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/api/v1/me/invitations/${seeded.organizationId}/reject`)
        ),
        page.getByRole('button', { name: 'Từ chối' }).click(),
      ])
      expect([200, 204, 303]).toContain(rejectResponse.status())

      await expect(page.getByText(seeded.organizationName)).toHaveCount(0)
    } finally {
      await page.context().clearCookies()
    }
  })

  test('foreign user cannot accept or reject another user invitation', async ({ page }) => {
    await login(page, E2E_USER)
    const seeded = await seedOrganizationInvitationFlow(page, {
      withPendingInvitation: true,
      withForeignUser: true,
    })
    expect(typeof seeded.foreignUserEmail).toBe('string')
    expect(seeded.foreignUserEmail?.length).toBeGreaterThan(0)
    expect(typeof seeded.foreignWorkspaceId).toBe('string')
    expect(seeded.foreignWorkspaceId?.length).toBeGreaterThan(0)
    const foreignUserEmail = seeded.foreignUserEmail
    const foreignWorkspaceId = seeded.foreignWorkspaceId
    if (!foreignUserEmail || !foreignWorkspaceId) {
      throw new Error('Foreign invitation seed missing user email or workspace id')
    }

    try {
      await page.context().clearCookies()
      await login(page, foreignUserEmail, { organizationId: foreignWorkspaceId })
      await page.goto('/profile/invitations')
      await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
      const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')

      for (const action of ['accept', 'reject']) {
        const forbiddenResponse = await page.request.put(
          `${BASE}/api/v1/me/invitations/${seeded.organizationId}/${action}`,
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-CSRF-TOKEN': csrfToken ?? '',
            },
          }
        )
        expect([403, 404, 422]).toContain(forbiddenResponse.status())
      }

      await page.context().clearCookies()
      await login(page, seeded.inviteeEmail)
      await page.goto('/profile/invitations')
      await page.waitForLoadState('domcontentloaded')

      await expect(page.getByText(seeded.organizationName).first()).toBeVisible()
      await expect(page.getByRole('button', { name: 'Đồng ý' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Từ chối' })).toBeVisible()
    } finally {
      await page.context().clearCookies()
    }
  })

  test('stale invitation accept is denied and the stale row stays visible', async ({ page }) => {
    await login(page, E2E_USER)
    const seeded = await seedOrganizationInvitationFlow(page, { withPendingInvitation: true })

    try {
      await page.context().clearCookies()
      await login(page, seeded.inviteeEmail)
      await page.goto('/profile/invitations')
      await page.waitForLoadState('domcontentloaded')

      const invitationCard = page.locator('.overflow-hidden').filter({ hasText: seeded.organizationName })
      await expect(invitationCard).toBeVisible()
      await expect(invitationCard.getByRole('button', { name: 'Đồng ý' })).toBeVisible()

      await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
      const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
      const staleResponse = await page.request.put(
        `${BASE}/api/v1/me/invitations/${seeded.organizationId}/reject`,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': csrfToken ?? '',
          },
        }
      )
      expect([200, 204, 303]).toContain(staleResponse.status())

      const [acceptResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/api/v1/me/invitations/${seeded.organizationId}/accept`)
        ),
        invitationCard.getByRole('button', { name: 'Đồng ý' }).click(),
      ])

      expect([403, 404, 422]).toContain(acceptResponse.status())
      await expect(invitationCard).toBeVisible()
      await expect(page.locator('body')).not.toContainText('Server Error')
      await expect(page.locator('body')).not.toContainText('500')
    } finally {
      await page.context().clearCookies()
    }
  })
})
