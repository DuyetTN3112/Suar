import { mkdirSync } from 'node:fs'
import path from 'node:path'

import { test, expect, type Page } from '@playwright/test'

import { getTestingAuthState, login } from '../../shared/e2e/helpers.js'

const ADMIN_EMAIL = 'td6622i@gre.ac.uk'
const REGULAR_EMAIL = 'tranngocduyet31@gmail.com'
const AUDIT_CONSOLE_HEADING = /Audit log hệ thống/i
const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const ENTERPRISE_AUDIT_SCREENSHOT_DIR = path.join(
  process.cwd(),
  'test-results/e2e-visual/enterprise-audit-log'
)

interface SeededAuditLog {
  id?: string
  action: string
  entityType: string
  entityId: string
  eventName?: string | null
  requestId?: string | null
  traceId?: string | null
  retentionClass?: string | null
  actorUserId?: string | null
  organizationScopeId?: string | null
  userScopeId?: string | null
}

interface SeededProjectMemberFlow {
  organizationId: string
  ownerEmail: string
  ownerId: string
  memberId: string
}

interface SeedAuditScope {
  surface: 'system' | 'organization' | 'user'
  userId?: string
  organizationId?: string
}

interface SeedAuditLogOptions {
  actionPrefix?: string
  enterprise?: boolean
  entityType?: string
  entityId?: string
  eventName?: string
  eventFamily?: string
  module?: string
  workflow?: string
  actorUserId?: string
  actorOrganizationId?: string
  targetOrganizationId?: string
  userEmail?: string
  userScopeId?: string
  organizationScopeId?: string
  requestId?: string
  traceId?: string
  retentionClass?: string
  scopes?: SeedAuditScope[]
}

async function seedAuditLog(
  page: Page,
  options: SeedAuditLogOptions = {}
): Promise<SeededAuditLog> {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 8)
  const actionPrefix = options.actionPrefix ?? 'e2e.audit_console.seeded'
  const action = `${actionPrefix}.${timestamp}.${nonce}`
  const entityType = options.entityType ?? 'task'
  const entityId = options.entityId ?? `e2e-audit-target-${timestamp}-${nonce}`
  await page.goto('/admin/audit-logs?view=overview')
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  const response = await page.request.post(`${BASE}/api/testing/seed-audit-log`, {
    headers: {
      'X-CSRF-TOKEN': csrfToken ?? '',
    },
    data: {
      action,
      entityId,
      entityType,
      timestamp,
      nonce,
      enterprise: options.enterprise ?? false,
      eventName: options.eventName,
      eventFamily: options.eventFamily,
      module: options.module,
      workflow: options.workflow,
      actorUserId: options.actorUserId,
      actorOrganizationId: options.actorOrganizationId,
      targetOrganizationId: options.targetOrganizationId,
      userEmail: options.userEmail,
      userScopeId: options.userScopeId,
      organizationScopeId: options.organizationScopeId,
      requestId: options.requestId,
      traceId: options.traceId,
      retentionClass: options.retentionClass,
      scopes: options.scopes,
    },
  })

  expect(response.status()).toBe(201)

  const body = (await response.json()) as { data?: SeededAuditLog }
  const seeded = body.data
  expect(seeded).toBeDefined()
  if (!seeded) {
    throw new Error('Testing seed-audit-log response did not include data')
  }
  expect(seeded.action).toBe(action)
  expect(seeded.entityId).toBe(entityId)
  expect(seeded.entityType).toBe(entityType)

  return seeded
}

async function seedOrgOwner(page: Page): Promise<SeededProjectMemberFlow> {
  await login(page, ADMIN_EMAIL, { systemRole: 'superadmin' })
  await page.goto('/admin')
  await expect(page.locator('meta[name="csrf-token"]')).toBeAttached()
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content')
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 8)
  const response = await page.request.post(`${BASE}/api/testing/seed-project-member-flow`, {
    headers: {
      'X-CSRF-TOKEN': csrfToken ?? '',
    },
    data: { timestamp, nonce },
  })

  expect(response.status()).toBe(201)

  const body = (await response.json()) as { data?: SeededProjectMemberFlow }
  const seeded = body.data
  expect(seeded).toBeDefined()
  if (!seeded) {
    throw new Error('Testing seed-project-member-flow response did not include data')
  }
  expect(seeded.ownerEmail).toMatch(/@test\.com$/)
  expect(seeded.organizationId).toMatch(/\S/)

  await page.context().clearCookies()
  return seeded
}

async function resolveRegularUserOrganizationId(page: Page): Promise<string> {
  await page.context().clearCookies()
  await login(page, REGULAR_EMAIL, { systemRole: 'registered_user' })

  const state = await getTestingAuthState(page)
  const organizationId = state?.sessionOrganizationId ?? state?.currentOrganizationId ?? null
  expect(organizationId).toMatch(/\S/)
  if (!organizationId) {
    throw new Error('Testing auth state did not include organization id')
  }

  await page.context().clearCookies()
  return organizationId
}

async function openAuditConsole(page: Page, params: Record<string, string> = {}) {
  await openAuditSurface(page, '/admin/audit-logs', AUDIT_CONSOLE_HEADING, params)
}

async function openAuditSurface(
  page: Page,
  surfacePath: string,
  heading: RegExp,
  params: Record<string, string> = {}
) {
  const searchParams = new URLSearchParams({ view: 'overview', ...params })
  await page.goto(`${surfacePath}?${searchParams.toString()}`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
}

async function expectEnterpriseAuditDetail(page: Page, seeded: SeededAuditLog) {
  await expect(page.getByTestId('audit-log-row')).toHaveCount(1)
  await expect(page.getByTestId('audit-log-row').first()).toContainText(seeded.action)
  await expect(page.getByTestId('audit-log-row').first()).toContainText(seeded.entityType)

  await page.getByTestId('audit-log-row').first().click()
  await expect(page.getByTestId('audit-log-detail-panel')).toBeVisible()
  await expect(page.getByTestId('audit-log-detail-panel')).toContainText(seeded.action)
  await expect(page.getByTestId('audit-log-detail-panel')).toContainText(seeded.entityId)
  if (seeded.requestId) {
    await expect(page.getByTestId('audit-log-detail-panel')).toContainText(seeded.requestId)
  }
  if (seeded.traceId) {
    await expect(page.getByTestId('audit-log-detail-panel')).toContainText(seeded.traceId)
  }
}

async function expectScopedActivityWithoutForensics(
  page: Page,
  seeded: SeededAuditLog,
  visibleTitle: string
) {
  await expect(page.getByText(visibleTitle, { exact: true }).first()).toBeVisible()

  for (const forbiddenValue of [
    seeded.action,
    seeded.entityId,
    seeded.requestId,
    seeded.traceId,
  ].filter((value): value is string => Boolean(value))) {
    await expect(page.getByText(forbiddenValue, { exact: true })).toHaveCount(0)
  }

  await expect(page.getByText('Raw payload', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Request ID', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Trace ID', { exact: true })).toHaveCount(0)
  await expect(page.getByText('User agent', { exact: true })).toHaveCount(0)
}

function enterpriseAuditScreenshotPath(fileName: string): string {
  mkdirSync(ENTERPRISE_AUDIT_SCREENSHOT_DIR, { recursive: true })
  return path.join(ENTERPRISE_AUDIT_SCREENSHOT_DIR, fileName)
}

test.describe('Admin Audit Logs Console E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, { systemRole: 'superadmin' })
  })

  test('superadmin sees subscription as a separate sidebar domain', async ({
    page,
  }, testInfo) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const sidebar = page.locator('aside')
    const group = (title: string) =>
      sidebar.locator('nav > div').filter({
        has: page.locator('p').filter({ hasText: new RegExp(`^${title}$`) }),
      })

    const overviewGroup = group('Admin overview')
    const subscriptionGroup = group('Subscription')
    const systemGroup = group('System')

    await expect(subscriptionGroup).toBeVisible()
    await expect(subscriptionGroup.getByRole('button', { name: 'Subscription dashboard' })).toBeVisible()
    await expect(subscriptionGroup.getByRole('button', { name: 'Packages' })).toBeVisible()
    await expect(subscriptionGroup.getByRole('button', { name: 'Personal package QR' })).toBeVisible()
    await expect(overviewGroup.getByRole('button', { name: 'Subscription dashboard' })).toHaveCount(0)
    await expect(systemGroup.getByRole('button', { name: 'Packages' })).toHaveCount(0)
    await expect(systemGroup.getByRole('button', { name: 'Personal package QR' })).toHaveCount(0)

    await page.screenshot({
      path: testInfo.outputPath('admin-subscription-sidebar-domain.png'),
      fullPage: true,
    })
  })

  test('superadmin can inspect a seeded audit log and exact action filter', async ({
    page,
  }, testInfo) => {
    const seeded = await seedAuditLog(page)
    await openAuditConsole(page, { action: seeded.action })

    await expect(
      page.getByRole('heading', { name: AUDIT_CONSOLE_HEADING })
    ).toBeVisible()
    await expect(page.getByText('Hành động')).toBeVisible()
    await expect(page.getByText('Event', { exact: true })).toBeVisible()
    await expect(page.getByTestId('audit-log-row')).toHaveCount(1)
    await expect(page.getByTestId('audit-log-row').first()).toContainText(seeded.action)
    await expect(page.getByTestId('audit-log-row').first()).toContainText(seeded.entityType)

    await page.getByTestId('audit-log-row').first().click()
    await expect(page.getByTestId('audit-log-detail-panel')).toBeVisible()
    await expect(page.getByTestId('audit-log-detail-panel')).toContainText(seeded.action)
    await expect(page.getByTestId('audit-log-detail-panel')).toContainText(seeded.entityType)
    await expect(page.getByTestId('audit-log-detail-panel')).toContainText(seeded.entityId)

    await page.screenshot({
      path: testInfo.outputPath('admin-audit-console-overview.png'),
      fullPage: true,
    })

    await openAuditConsole(page, { action: `${seeded.action}.missing` })
    await expect(page.getByText('Không có audit log.')).toBeVisible()
    await expect(page.getByTestId('audit-log-row')).toHaveCount(0)
    await expect(page.getByText(seeded.action)).toHaveCount(0)

    await page.screenshot({
      path: testInfo.outputPath('admin-audit-console-filter-empty.png'),
      fullPage: true,
    })
  })

  test('enterprise audit events render scoped system organization and user logs', async ({
    page,
  }) => {
    const organizationId = await resolveRegularUserOrganizationId(page)
    await login(page, ADMIN_EMAIL, { systemRole: 'superadmin' })

    const suffix = Math.random().toString(36).slice(2, 8)
    const systemAudit = await seedAuditLog(page, {
      enterprise: true,
      actionPrefix: 'e2e.enterprise.system',
      entityType: 'platform_policy',
      eventName: `e2e.enterprise.system_reviewed.${suffix}`,
      eventFamily: 'system.compliance',
      module: 'audit',
      workflow: 'system_console',
      requestId: `req-system-${suffix}`,
      traceId: `trace-system-${suffix}`,
      retentionClass: 'security_1y',
      scopes: [{ surface: 'system' }],
    })
    const orgAudit = await seedAuditLog(page, {
      enterprise: true,
      actionPrefix: 'e2e.enterprise.organization',
      entityType: 'organization',
      entityId: organizationId,
      eventName: `e2e.enterprise.organization_updated.${suffix}`,
      eventFamily: 'organization.settings',
      module: 'organizations',
      workflow: 'settings',
      actorOrganizationId: organizationId,
      targetOrganizationId: organizationId,
      organizationScopeId: organizationId,
      requestId: `req-org-${suffix}`,
      traceId: `trace-org-${suffix}`,
      retentionClass: 'business_7y',
      scopes: [{ surface: 'organization', organizationId }],
    })
    const userAudit = await seedAuditLog(page, {
      enterprise: true,
      actionPrefix: 'e2e.enterprise.user',
      entityType: 'user',
      eventName: `e2e.enterprise.user_profile_updated.${suffix}`,
      eventFamily: 'user.profile',
      module: 'users',
      workflow: 'profile',
      userEmail: REGULAR_EMAIL,
      requestId: `req-user-${suffix}`,
      traceId: `trace-user-${suffix}`,
      retentionClass: 'user_1y',
    })

    await openAuditConsole(page, { action: systemAudit.action })
    await expectEnterpriseAuditDetail(page, systemAudit)
    await page.screenshot({
      path: enterpriseAuditScreenshotPath('enterprise-system-audit-console.png'),
      fullPage: true,
    })

    await login(page, REGULAR_EMAIL, {
      organizationId,
      systemRole: 'registered_user',
    })
    await openAuditSurface(page, '/org/audit-logs', /Audit log tổ chức/i)
    await expectScopedActivityWithoutForensics(
      page,
      orgAudit,
      'Thiết lập tổ chức đã thay đổi'
    )
    await page.screenshot({
      path: enterpriseAuditScreenshotPath('enterprise-organization-audit-console.png'),
      fullPage: true,
    })

    await login(page, REGULAR_EMAIL, { systemRole: 'registered_user' })
    await openAuditSurface(page, '/settings/audit-logs', /Audit log của tôi/i)
    await expectScopedActivityWithoutForensics(page, userAudit, 'Hoạt động tài khoản')
    await page.screenshot({
      path: enterpriseAuditScreenshotPath('enterprise-user-audit-console.png'),
      fullPage: true,
    })
  })
})

test.describe('Admin shell access boundaries E2E', () => {
  test('regular authenticated user cannot open admin audit logs', async ({ page }) => {
    await login(page, REGULAR_EMAIL, { systemRole: 'registered_user' })

    const response = await page.goto('/admin/audit-logs?view=overview')
    await page.waitForLoadState('domcontentloaded')

    const blockedByStatus = response?.status() === 403 || response?.status() === 404
    const blockedByRedirect = !new URL(page.url()).pathname.startsWith('/admin/audit-logs')
    expect(blockedByStatus || blockedByRedirect).toBe(true)
    await expect(page.getByRole('heading', { name: AUDIT_CONSOLE_HEADING })).toHaveCount(0)
    await expect(page.getByTestId('audit-log-row')).toHaveCount(0)
  })

  test('regular authenticated user cannot open admin dashboard shell', async ({ page }) => {
    await login(page, REGULAR_EMAIL, { systemRole: 'registered_user' })

    const response = await page.goto('/admin')
    await page.waitForLoadState('domcontentloaded')

    const blockedByStatus = response?.status() === 403 || response?.status() === 404
    const blockedByRedirect = !new URL(page.url()).pathname.startsWith('/admin')
    expect(blockedByStatus || blockedByRedirect).toBe(true)
    await expect(page.getByRole('heading', { name: /Admin Dashboard|Bảng điều khiển Admin/i })).toHaveCount(0)
  })

  test('organization owner cannot open system admin dashboard shell', async ({ page }) => {
    const seeded = await seedOrgOwner(page)
    await login(page, seeded.ownerEmail, {
      organizationId: seeded.organizationId,
      systemRole: 'registered_user',
    })

    const response = await page.goto('/admin')
    await page.waitForLoadState('domcontentloaded')

    const blockedByStatus = response?.status() === 403 || response?.status() === 404
    const blockedByRedirect = !new URL(page.url()).pathname.startsWith('/admin')
    expect(blockedByStatus || blockedByRedirect).toBe(true)
    await expect(page.getByRole('heading', { name: /Admin Dashboard|Bảng điều khiển Admin/i })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Users|Organizations|Audit|Packages/i })).toHaveCount(0)
  })

  test('regular authenticated user cannot open admin packages surface', async ({ page }) => {
    await login(page, REGULAR_EMAIL, { systemRole: 'registered_user' })

    await page.goto('/admin/packages')
    await page.waitForLoadState('domcontentloaded')

    expect(new URL(page.url()).pathname).not.toBe('/admin/packages')
    await expect(page.getByRole('heading', { name: /Packages|Gói|Subscriptions|Đăng ký/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Save|Update|Lưu|Cập nhật/i })).toHaveCount(0)
    await expect(page.locator('table')).toHaveCount(0)
  })

  test('guest is redirected away from admin audit logs', async ({ page }) => {
    await page.goto('/admin/audit-logs?view=overview')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: /Đăng nhập/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: AUDIT_CONSOLE_HEADING })).toHaveCount(0)
    await expect(page.getByTestId('audit-log-row')).toHaveCount(0)
  })

  test('guest is redirected away from admin dashboard shell', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('domcontentloaded')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: /Đăng nhập/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Admin Dashboard|Bảng điều khiển Admin/i })).toHaveCount(0)
  })
})
