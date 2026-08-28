import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const ADMIN_EMAIL = 'td6622i@gre.ac.uk'
const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`
const AUDIT_HEADING = /Audit log hệ thống|System audit log/i

interface SeededAuditLog {
  action: string
  entityId: string
  requestId?: string | null
  traceId?: string | null
}

interface AuditApiResponse {
  data: Array<{
    action: string
    resourceType: string
    investigation?: {
      requestId?: string | null
      traceId?: string | null
    }
  }>
  filters: Record<string, unknown>
}

const seedTimestamps: number[] = []

async function seedAuditLog(
  page: Page,
  input: {
    timestamp: number
    nonce: string
    action: string
    entityType: string
    entityId: string
    enterprise?: boolean
    eventName?: string
    actorType?: string
    requestId?: string
    traceId?: string
  }
): Promise<SeededAuditLog> {
  const response = await page.request.post(`${BASE}/api/testing/seed-audit-log`, {
    data: {
      ...input,
      scopes: input.enterprise ? [{ surface: 'system' }] : [],
      oldValues: { status: 'queued' },
      newValues: { status: 'verified' },
      module: 'admin',
      workflow: 'rp_fst_04_audit_investigation',
      severity: 'info',
      outcome: 'success',
      retentionClass: 'security_audit',
    },
  })

  expect(response.status()).toBe(201)
  const body = (await response.json()) as { data?: SeededAuditLog }
  expect(body.data).toBeDefined()
  if (!body.data) {
    throw new Error('Testing seed-audit-log response did not include data')
  }

  return body.data
}

async function cleanupAuditSeeds(page: Page) {
  if (seedTimestamps.length === 0) return

  const response = await page.request.post(`${BASE}/api/testing/seed-cleanup`, {
    data: { tokens: [...new Set(seedTimestamps)] },
  })
  expect(response.ok()).toBeTruthy()
  seedTimestamps.length = 0
}

test.describe('RP-FST-04 | Admin audit SQL investigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, { systemRole: 'superadmin' })
  })

  test.afterEach(async ({ page }) => {
    await cleanupAuditSeeds(page)
  })

  test('stages filters before Apply and finds an off-page event through SQL authority', async ({
    page,
  }, testInfo) => {
    const decoyTimestamp = Date.parse('2026-08-01T12:00:00.000Z')
    const targetTimestamp = Date.parse('2026-08-01T11:00:00.000Z')
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const resourceType = `rp_fst_04_resource_${nonce}`
    const targetAction = `rp-fst-04.target.${nonce}`
    const targetEntityId = `rp-fst-04-target-${nonce}`
    const requestId = `rp-fst-04-request-${nonce}`
    const traceId = `rp-fst-04-trace-${nonce}`

    seedTimestamps.push(decoyTimestamp, targetTimestamp)

    await Promise.all(
      Array.from({ length: 50 }, (_, index) =>
        seedAuditLog(page, {
          timestamp: decoyTimestamp,
          nonce: `${nonce}-decoy-${index}`,
          action: `rp-fst-04.decoy.${index}.${nonce}`,
          entityType: resourceType,
          entityId: `rp-fst-04-decoy-${index}-${nonce}`,
        })
      )
    )

    const target = await seedAuditLog(page, {
      timestamp: targetTimestamp,
      nonce: `${nonce}-target`,
      action: targetAction,
      entityType: resourceType,
      entityId: targetEntityId,
      enterprise: true,
      eventName: 'rp_fst_04.off_page_target',
      actorType: 'automation',
      requestId,
      traceId,
    })

    const initialUrl = `/admin/audit-logs?view=overview&resourceType=${encodeURIComponent(resourceType)}`
    await page.goto(initialUrl)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: AUDIT_HEADING })).toBeVisible()
    await expect(page.locator('header').getByText('51', { exact: true })).toBeVisible()
    await expect(page.getByTestId('audit-log-row')).toHaveCount(50)
    await expect(page.getByText(targetAction, { exact: true })).toHaveCount(0)

    const initialRows = await page.getByTestId('audit-log-row').allTextContents()
    const initialBrowserUrl = page.url()

    const advanced = page.locator('details')
    const actionInput = advanced.locator('input[placeholder="task.assigned"]')
    await actionInput.fill(targetAction)
    await advanced.locator('select').selectOption('automation')
    await advanced.locator('input[type="date"]').nth(0).fill('2026-08-01')
    await advanced.locator('input[type="date"]').nth(1).fill('2026-08-02')

    await expect(page).toHaveURL(initialBrowserUrl)
    await expect(page.getByTestId('audit-log-row')).toHaveCount(50)
    await expect(page.getByTestId('audit-log-row').allTextContents()).resolves.toEqual(initialRows)
    await page.screenshot({
      path: testInfo.outputPath('01-admin-audit-staged-draft.png'),
      fullPage: true,
    })

    await Promise.all([
      page.waitForURL((url) => {
        return (
          url.searchParams.get('action') === targetAction &&
          url.searchParams.get('resourceType') === resourceType &&
          !url.searchParams.has('after') &&
          !url.searchParams.has('before')
        )
      }),
      page.getByRole('button', { name: /Apply|Áp dụng/i }).click(),
    ])

    await expect(page.getByTestId('audit-log-row')).toHaveCount(1)
    await expect(page.locator('header').getByText('1', { exact: true })).toBeVisible()
    await expect(page.getByTestId('audit-log-row')).toContainText('rp_fst_04.off_page_target')
    await page.screenshot({
      path: testInfo.outputPath('02-admin-audit-applied-results.png'),
      fullPage: true,
    })

    await page.getByTestId('audit-log-row').click()
    await expect(page).toHaveURL(/event=/)
    await expect(page.getByTestId('audit-log-detail-panel')).toContainText(targetEntityId)
    await expect(page.getByTestId('audit-log-detail-panel')).toContainText(requestId)
    await expect(page.getByTestId('audit-log-detail-panel')).toContainText(traceId)

    const apiResponse = await page.request.get(`${BASE}/api/admin/audit-logs`, {
      params: {
        action: targetAction,
        resourceType,
        actorType: 'automation',
        from: '2026-08-01',
        to: '2026-08-02',
      },
    })
    expect(apiResponse.status()).toBe(200)
    const apiBody = (await apiResponse.json()) as AuditApiResponse
    expect(apiBody.data).toHaveLength(1)
    expect(apiBody.data[0]).toMatchObject({
      action: target.action,
      resourceType,
      investigation: { requestId, traceId },
    })
    expect(apiBody.filters).toMatchObject({
      action: targetAction,
      resourceType,
      actorType: 'automation',
    })
  })
})
