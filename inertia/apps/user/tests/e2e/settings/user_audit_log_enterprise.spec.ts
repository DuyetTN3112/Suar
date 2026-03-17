import { mkdirSync } from 'node:fs'
import path from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const ADMIN_EMAIL = 'td6622i@gre.ac.uk'
const REGULAR_EMAIL = 'tranngocduyet31@gmail.com'
const BASE_URL = `http://127.0.0.1:${process.env['PORT'] ?? '3333'}`
const SCREENSHOT_DIR = path.join(
  process.cwd(),
  'test-results/e2e-visual/user-audit-log'
)

interface SeededAuditEvidence {
  id: string
  userScopeId: string
}

interface PersonalAuditFixture {
  affectedEventId: string
  authorityMarker: string
  filterToken: string
  foreignMarker: string
  piiMarker: string
  requestMarker: string
  selfEventId: string
  traceMarker: string
}

async function csrfToken(page: Page): Promise<string> {
  await page.goto('/admin')
  const meta = page.locator('meta[name="csrf-token"]')
  await expect(meta).toBeAttached()
  return (await meta.getAttribute('content')) ?? ''
}

async function seedAuditEvidence(
  page: Page,
  token: string,
  data: Record<string, unknown>
): Promise<SeededAuditEvidence> {
  const response = await page.request.post(`${BASE_URL}/api/testing/seed-audit-log`, {
    headers: { 'X-CSRF-TOKEN': token },
    data: {
      enterprise: true,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).slice(2, 8),
      ...data,
    },
  })
  expect(response.status()).toBe(201)

  const body = (await response.json()) as {
    data?: {
      id?: string
      userScopeId?: string
    }
  }
  const id = body.data?.id
  const userScopeId = body.data?.userScopeId
  expect(id).toMatch(/\S/)
  expect(userScopeId).toMatch(/\S/)
  if (!id || !userScopeId) {
    throw new Error('User audit E2E seed did not return evidence and scope identifiers')
  }

  return { id, userScopeId }
}

async function seedPersonalAuditFixture(page: Page): Promise<PersonalAuditFixture> {
  await login(page, ADMIN_EMAIL, { systemRole: 'superadmin' })
  const token = await csrfToken(page)
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const filterToken = `personal_e2e_${suffix}`
  const authorityMarker = `authority-identity-${suffix}`
  const foreignMarker = `foreign-private-${suffix}`
  const piiMarker = `personal-email-${suffix}@example.test`
  const requestMarker = `request-personal-${suffix}`
  const traceMarker = `trace-personal-${suffix}`

  const authority = await seedAuditEvidence(page, token, {
    action: `user.profile.updated.${authorityMarker}`,
    eventName: `user.profile.updated.${authorityMarker}`,
    eventFamily: 'user.profile',
    module: 'users',
    entityType: 'user',
    userEmail: `authority-${suffix}@test.com`,
    oldValues: { username: authorityMarker },
    newValues: { username: `${authorityMarker}-updated` },
  })

  const self = await seedAuditEvidence(page, token, {
    action: `update_user_details.${filterToken}.profile`,
    eventName: `user.profile.details_updated.${filterToken}.profile`,
    eventFamily: 'user.profile',
    module: 'users',
    entityType: 'user',
    userEmail: REGULAR_EMAIL,
    requestId: requestMarker,
    traceId: traceMarker,
    retentionClass: 'user_security_2y',
    oldValues: {
      email: piiMarker,
      password: `secret-before-${suffix}`,
      timezone: 'Asia/Ho_Chi_Minh',
    },
    newValues: {
      email: `updated-${piiMarker}`,
      password: `secret-after-${suffix}`,
      timezone: 'UTC',
    },
  })

  const affected = await seedAuditEvidence(page, token, {
    action: `change_user_role.${filterToken}.access`,
    eventName: `user.system_role.changed.${filterToken}.access`,
    eventFamily: 'access',
    module: 'admin',
    entityType: 'user',
    userEmail: REGULAR_EMAIL,
    actorUserId: authority.userScopeId,
    targetType: 'user',
    targetId: self.userScopeId,
    requestId: `request-affected-${suffix}`,
    traceId: `trace-affected-${suffix}`,
    retentionClass: 'user_security_2y',
    oldValues: { role: 'registered_user' },
    newValues: { role: 'system_admin' },
  })

  await seedAuditEvidence(page, token, {
    action: `auth.login.completed.${filterToken}`,
    eventName: `auth.login.completed.${filterToken}`,
    eventFamily: 'auth.session',
    module: 'auth',
    entityType: 'user',
    userEmail: REGULAR_EMAIL,
    retentionClass: 'support_trace',
    oldValues: {},
    newValues: { checkpoint: 'token-issued' },
  })

  await seedAuditEvidence(page, token, {
    action: `user.profile.updated.${filterToken}.${foreignMarker}`,
    eventName: `user.profile.updated.${filterToken}.${foreignMarker}`,
    eventFamily: 'user.profile',
    module: 'users',
    entityType: 'user',
    userEmail: `foreign-${suffix}@test.com`,
    oldValues: { username: foreignMarker },
    newValues: { username: `${foreignMarker}-updated` },
  })

  return {
    affectedEventId: affected.id,
    authorityMarker,
    filterToken,
    foreignMarker,
    piiMarker,
    requestMarker,
    selfEventId: self.id,
    traceMarker,
  }
}

function screenshotPath(fileName: string): string {
  mkdirSync(SCREENSHOT_DIR, { recursive: true })
  return path.join(SCREENSHOT_DIR, fileName)
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const viewportWidth = page.viewportSize()?.width ?? 0
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(documentWidth).toBeLessThanOrEqual(viewportWidth + 1)
}

test.describe('User audit log enterprise E2E', () => {
  test('renders personal evidence, protects forensic data, filters safely, and remains responsive', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })

    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text())
      }
    })

    const fixture = await seedPersonalAuditFixture(page)

    await page.context().clearCookies()
    await login(page, REGULAR_EMAIL, { systemRole: 'registered_user' })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`/settings/audit-logs?search=${encodeURIComponent(fixture.filterToken)}`)
    await page.waitForLoadState('networkidle')

    await expect(
      page.getByRole('heading', {
        name: /My audit log|My activity log|Nhật ký hoạt động của tôi/i,
      })
    ).toBeVisible()
    await expect(
      page.getByLabel(/Personal audit privacy boundary|Ranh giới riêng tư/i)
    ).toBeVisible()

    const rows = page.getByTestId('user-audit-row')
    await expect(rows).toHaveCount(2)
    const selfRow = rows
      .filter({ hasText: /Account profile updated|Đã cập nhật hồ sơ tài khoản/i })
      .first()
    const affectedRow = rows
      .filter({ hasText: /Access changed|Quyền truy cập đã thay đổi/i })
      .first()
    await expect(selfRow).toBeVisible()
    await expect(affectedRow).toBeVisible()
    await expect(
      selfRow.getByText(/Performed by you|Do bạn thực hiện/i, { exact: true })
    ).toBeVisible()
    await expect(
      affectedRow.getByText(
        /Affected your account|Affected you|Tác động đến tài khoản của bạn/i,
        { exact: true }
      )
    ).toBeVisible()
    await expect(
      affectedRow.getByText(/Authorized administrator|Người có thẩm quyền/i, { exact: true })
    ).toBeVisible()

    for (const forbiddenValue of [
      fixture.authorityMarker,
      fixture.foreignMarker,
      fixture.piiMarker,
      fixture.requestMarker,
      fixture.traceMarker,
      '127.0.0.1',
      'playwright-e2e',
      `secret-before-${fixture.filterToken.replace('personal_e2e_', '')}`,
      `secret-after-${fixture.filterToken.replace('personal_e2e_', '')}`,
      `auth.login.completed.${fixture.filterToken}`,
    ]) {
      await expect(page.getByText(forbiddenValue, { exact: false })).toHaveCount(0)
    }

    await selfRow.getByRole('button').click()
    await expect(page).toHaveURL(new RegExp(`event=${fixture.selfEventId}`))

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(fixture.selfEventId)
    await expect(dialog).toContainText(/Time zone|Timezone|Múi giờ/i)
    await expect(dialog).toContainText('Asia/Ho_Chi_Minh')
    await expect(dialog).toContainText('UTC')
    await expect(dialog).toContainText(/Protected|Được bảo vệ/i)
    await expect(dialog).toContainText(/Personal privacy boundary|Ranh giới riêng tư cá nhân/i)
    await expect(dialog).not.toContainText(fixture.requestMarker)
    await expect(dialog).not.toContainText(fixture.traceMarker)
    await expectNoHorizontalOverflow(page)

    await page.screenshot({
      path: screenshotPath('user-audit-log-desktop-detail.png'),
      fullPage: true,
    })

    await page
      .getByRole('button', { name: /Close event detail|Đóng chi tiết sự kiện/i })
      .click()
    await expect(page).not.toHaveURL(/event=/)

    const search = page.locator('#user-audit-search')
    await search.fill(`${fixture.filterToken}.profile`)
    await page.getByRole('button', { name: /Apply|Áp dụng/i }).click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/search=/)
    await expect(page.getByTestId('user-audit-row')).toHaveCount(1)
    await expect(
      page.getByText(/Performed by you|Do bạn thực hiện/i, { exact: true })
    ).toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/settings/audit-logs?search=${encodeURIComponent(fixture.filterToken)}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('user-audit-row')).toHaveCount(2)
    await expectNoHorizontalOverflow(page)

    await affectedRow.getByRole('button').click()
    const mobileDialog = page.getByRole('dialog')
    await expect(mobileDialog).toBeVisible()
    await expect(mobileDialog).toContainText(fixture.affectedEventId)
    await expect(mobileDialog).toContainText(/registered_user/)
    await expect(mobileDialog).toContainText(/system_admin/)
    await expect(mobileDialog).not.toContainText(fixture.authorityMarker)
    await expectNoHorizontalOverflow(page)

    const dialogBox = await mobileDialog.boundingBox()
    expect(dialogBox).not.toBeNull()
    if (dialogBox) {
      expect(dialogBox.x).toBeGreaterThanOrEqual(0)
      expect(dialogBox.width).toBeLessThanOrEqual(390)
    }

    await page.screenshot({
      path: screenshotPath('user-audit-log-mobile-detail.png'),
      fullPage: false,
    })

    expect(consoleErrors).toEqual([])
  })
})
