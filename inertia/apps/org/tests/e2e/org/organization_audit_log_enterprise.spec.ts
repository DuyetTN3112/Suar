import { mkdirSync } from 'node:fs'
import path from 'node:path'

import { expect, test, type Page } from '@playwright/test'

import { login } from '../../shared/e2e/helpers.js'

const ADMIN_EMAIL = 'td6622i@gre.ac.uk'
const BASE_URL = `http://127.0.0.1:${process.env['PORT'] ?? '3333'}`
const SCREENSHOT_DIR = path.join(
  process.cwd(),
  'test-results/e2e-visual/organization-audit-log'
)

interface SeededOrganizationAuditFlow {
  organizationId: string
  taskId: string
  taskTitle: string
  ownerEmail: string
  memberEmail: string
  eventId: string
  action: string
  requestId: string
  traceId: string
}

async function csrfToken(page: Page): Promise<string> {
  await page.goto('/admin')
  const meta = page.locator('meta[name="csrf-token"]')
  await expect(meta).toBeAttached()
  return (await meta.getAttribute('content')) ?? ''
}

async function seedOrganizationAuditFlow(page: Page): Promise<SeededOrganizationAuditFlow> {
  await login(page, ADMIN_EMAIL, { systemRole: 'superadmin' })

  const token = await csrfToken(page)
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 8)
  const seedKey = `${timestamp}-${nonce}`
  const memberFlowResponse = await page.request.post(
    `${BASE_URL}/api/testing/seed-project-member-flow`,
    {
      headers: { 'X-CSRF-TOKEN': token },
      data: { timestamp, nonce, demoNames: true },
    }
  )
  expect(memberFlowResponse.status()).toBe(201)

  const memberFlowBody = (await memberFlowResponse.json()) as {
    data?: {
      organizationId: string
      taskId: string
      ownerEmail: string
      memberEmail: string
      ownerId: string
    }
  }
  const memberFlow = memberFlowBody.data
  expect(memberFlow).toBeDefined()
  if (!memberFlow) {
    throw new Error('Organization audit E2E seed did not return a member flow')
  }

  const action = 'task.status.changed'
  const requestId = `request-org-audit-${seedKey}`
  const traceId = `trace-org-audit-${seedKey}`
  const auditResponse = await page.request.post(`${BASE_URL}/api/testing/seed-audit-log`, {
    headers: { 'X-CSRF-TOKEN': token },
    data: {
      timestamp: timestamp + 1,
      nonce,
      action,
      enterprise: true,
      entityType: 'task',
      entityId: memberFlow.taskId,
      actorUserId: memberFlow.ownerId,
      actorOrganizationId: memberFlow.organizationId,
      actorRoleSurface: 'org_owner',
      targetType: 'task',
      targetId: memberFlow.taskId,
      targetOrganizationId: memberFlow.organizationId,
      organizationScopeId: memberFlow.organizationId,
      eventFamily: 'task.lifecycle',
      module: 'tasks',
      workflow: 'status_change',
      outcome: 'success',
      requestId,
      traceId,
      retentionClass: 'business_7y',
      oldValues: {
        status: 'todo',
        api_token: 'api-token-must-not-leak',
      },
      newValues: {
        status: 'in_progress',
        password: 'password-must-not-leak',
      },
      scopes: [
        {
          surface: 'organization',
          organizationId: memberFlow.organizationId,
        },
      ],
    },
  })
  expect(auditResponse.status()).toBe(201)

  const auditBody = (await auditResponse.json()) as {
    data?: {
      id: string
    }
  }
  const seededAudit = auditBody.data
  expect(seededAudit).toBeDefined()
  if (!seededAudit) {
    throw new Error('Organization audit E2E seed did not return an audit event')
  }

  return {
    organizationId: memberFlow.organizationId,
    taskId: memberFlow.taskId,
    taskTitle: 'Verify checkout release',
    ownerEmail: memberFlow.ownerEmail,
    memberEmail: memberFlow.memberEmail,
    eventId: seededAudit.id,
    action,
    requestId,
    traceId,
  }
}

function screenshotPath(fileName: string): string {
  mkdirSync(SCREENSHOT_DIR, { recursive: true })
  return path.join(SCREENSHOT_DIR, fileName)
}

test.describe('Organization audit log enterprise E2E', () => {
  test('enforces org permission and renders accountable evidence without system forensics', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const seeded = await seedOrganizationAuditFlow(page)

    await page.context().clearCookies()
    await login(page, seeded.memberEmail, {
      organizationId: seeded.organizationId,
      systemRole: 'registered_user',
    })
    await page.goto('/org/audit-logs')
    await page.waitForLoadState('domcontentloaded')
    expect(new URL(page.url()).pathname).not.toBe('/org/audit-logs')
    await expect(
      page.getByRole('heading', {
        name: /Organization audit log|Nhật ký kiểm toán tổ chức/i,
      })
    ).toHaveCount(0)

    await page.context().clearCookies()
    await login(page, seeded.ownerEmail, {
      organizationId: seeded.organizationId,
      systemRole: 'registered_user',
    })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`/org/audit-logs?action=${encodeURIComponent(seeded.action)}`)
    await page.waitForLoadState('networkidle')

    await expect(
      page.getByRole('heading', {
        name: /Organization audit log|Nhật ký kiểm toán tổ chức/i,
      })
    ).toBeVisible()
    const table = page.getByRole('table', {
      name: /Organization governance history|Lịch sử quản trị tổ chức/i,
    })
    await expect(table).toBeVisible()
    await expect(table.locator('tbody tr')).toHaveCount(1)
    await expect(table).toContainText(seeded.taskTitle)
    await expect(table).toContainText('todo')
    await expect(table).toContainText('in_progress')
    await expect(
      table.getByRole('link', { name: seeded.taskTitle }).first()
    ).toHaveAttribute('href', `/org/tasks/${seeded.taskId}`)

    await page.locator('#audit-search').fill(seeded.taskTitle)
    const outcomeSelect = page.locator('#audit-outcome')
    if (!(await outcomeSelect.isVisible())) {
      await page.getByRole('button', { name: /More filters|Thêm bộ lọc/i }).click()
    }
    await outcomeSelect.selectOption('success')
    await page.getByRole('button', { name: /Apply filters|Áp dụng/i }).click()
    await expect(page).toHaveURL(/search=Verify\+checkout\+release/)
    await expect(page).toHaveURL(/outcome=success/)
    await expect(table.locator('tbody tr')).toHaveCount(1)

    await page
      .getByRole('button', { name: /View details|Xem chi tiết/i })
      .first()
      .click()
    const dialog = page.getByRole('dialog', {
      name: /Changed task status|Task status changed|Đổi trạng thái công việc/i,
    })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(seeded.eventId)
    await expect(dialog).toContainText(seeded.action)
    await expect(dialog).toContainText('org_owner')
    await expect(dialog).toContainText(seeded.taskId)

    for (const forbiddenValue of [
      seeded.requestId,
      seeded.traceId,
      '127.0.0.1',
      'playwright-e2e',
      'api-token-must-not-leak',
      'password-must-not-leak',
    ]) {
      await expect(page.getByText(forbiddenValue, { exact: false })).toHaveCount(0)
    }

    await page.screenshot({
      path: screenshotPath('organization-audit-log-desktop.png'),
      fullPage: true,
    })

    await page
      .getByRole('button', {
        name: /Close event detail|Đóng chi tiết sự kiện/i,
      })
      .click()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('table')).toBeHidden()
    await expect(
      page.getByText(seeded.taskTitle).filter({ visible: true }).first()
    ).toBeVisible()
    await page
      .getByRole('button', { name: /View details|Xem chi tiết/i })
      .first()
      .click()
    const mobileDialog = page.getByRole('dialog', {
      name: /Changed task status|Task status changed|Đổi trạng thái công việc/i,
    })
    await expect(mobileDialog).toBeVisible()
    const mobileDialogBox = await mobileDialog.boundingBox()
    expect(mobileDialogBox).not.toBeNull()
    if (mobileDialogBox) {
      expect(mobileDialogBox.x).toBeGreaterThanOrEqual(0)
      expect(mobileDialogBox.width).toBeLessThanOrEqual(390)
      expect(mobileDialogBox.x + mobileDialogBox.width).toBeLessThanOrEqual(390)
    }

    await page.screenshot({
      path: screenshotPath('organization-audit-log-mobile.png'),
      fullPage: false,
    })
  })
})
