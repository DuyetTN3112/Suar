import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AuditLogPage from '@/apps/org/modules/audit_logs/audit_log_page.svelte'

const { inertiaPage, visitMock } = vi.hoisted(() => ({
  inertiaPage: {
    url: '/org/audit-logs?search=task',
    props: {
      locale: 'en',
      translations: {},
    },
  },
  visitMock: vi.fn(),
}))

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@inertiajs/svelte', () => ({
  page: inertiaPage,
  router: {
    visit: visitMock,
  },
}))

const pagination = {
  mode: 'cursor' as const,
  total: 1,
  perPage: 50,
  page: 1,
  lastPage: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  cursor: {
    nextCursor: null,
    previousCursor: null,
  },
}

const filters = {
  search: 'task',
  action: null,
  resourceType: null,
  outcome: null,
  userId: null,
  from: null,
  to: null,
  after: null,
  before: null,
}

const auditLog = {
  id: 'audit-event-1',
  category: 'task' as const,
  outcome: 'success' as const,
  title: 'Task changed',
  description: 'Task change recorded.',
  occurredAt: '2026-07-19T08:00:22.000Z',
  actionCode: 'task.status.changed',
  actionKey: 'task_status_changed',
  actor: {
    type: 'user' as const,
    label: 'ngocduyet',
    roleLabel: 'org_admin',
  },
  target: {
    type: 'task',
    id: 'task-1',
    label: 'Quarterly report',
  },
  changes: [
    {
      field: 'status',
      operation: 'changed' as const,
      before: 'todo',
      after: 'in_progress',
      redacted: false,
    },
  ],
  changeCount: 1,
  actorLabel: 'ngocduyet',
  subjectLabel: 'Task',
}

describe('Organization audit log page', () => {
  beforeEach(() => {
    visitMock.mockReset()
    inertiaPage.url = '/org/audit-logs?search=task'
    window.history.replaceState({}, '', inertiaPage.url)
  })

  it('renders an accountable semantic table and safe before/after values', () => {
    render(AuditLogPage, {
      props: {
        auditLogs: [auditLog],
        pagination,
        filters,
        title: 'Organization audit log',
      },
    })

    expect(
      screen.getByRole('table', {
        name: /organization governance history|lịch sử quản trị tổ chức/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/Task Status Changed|Đổi trạng thái công việc/i).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('ngocduyet').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Quarterly report').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Quarterly report' })[0]).toHaveAttribute(
      'href',
      '/org/tasks/task-1'
    )
    expect(screen.getAllByText('todo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('in_progress').length).toBeGreaterThan(0)
    expect(screen.getByRole('columnheader', { name: /Target|Đối tượng/i })).toBeInTheDocument()
    expect(
      screen.queryByText(/ipAddress|userAgent|traceId|requestId|eventHash/i)
    ).not.toBeInTheDocument()
  })

  it('opens an accessible organization-safe detail sheet', async () => {
    render(AuditLogPage, {
      props: {
        auditLogs: [auditLog],
        pagination,
        filters,
        title: 'Organization audit log',
      },
    })

    const detailButtons = screen.getAllByRole('button', {
      name: /(?:View details|Xem chi tiết): (?:Task Status Changed|Đổi trạng thái công việc)/i,
    })
    const detailButton = detailButtons.at(0)
    expect(detailButton).toBeDefined()
    if (!detailButton) return
    await fireEvent.click(detailButton)

    const dialog = screen.getByRole('dialog', {
      name: /Task Status Changed|Đổi trạng thái công việc/i,
    })
    expect(within(dialog).getByText('audit-event-1')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('org_admin')
    expect(dialog).toHaveTextContent('task-1')
    expect(
      within(dialog).getByText(
        /System diagnostics, network identity and raw payloads|Dữ liệu chẩn đoán hệ thống, định danh mạng và payload thô/i
      )
    ).toBeInTheDocument()
    expect(within(dialog).queryByText(/127\.0\.0\.1|trace-|request-/i)).not.toBeInTheDocument()
  })

  it('distinguishes an empty filtered result from an empty audit history', () => {
    render(AuditLogPage, {
      props: {
        auditLogs: [],
        pagination: { ...pagination, total: 0 },
        filters,
        title: 'Organization audit log',
      },
    })

    expect(
      screen.getByRole('heading', {
        name: /No records match these filters|Không có bản ghi phù hợp bộ lọc/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /Clear filters|Xóa bộ lọc/i }).length
    ).toBeGreaterThan(0)
  })

  it('renders organization custom-role permission changes as bounded evidence', () => {
    render(AuditLogPage, {
      props: {
        auditLogs: [
          {
            ...auditLog,
            id: 'audit-role-event',
            category: 'access',
            title: 'Access changed',
            actionCode: 'organization.custom_roles.updated',
            actionKey: 'organization_custom_roles_updated',
            target: {
              type: 'organization',
              id: 'org-1',
              label: 'Suar',
            },
            changes: [
              {
                field: 'custom_role.compliance_reviewer',
                operation: 'added',
                before: null,
                after: 'can_view_audit_logs',
                redacted: false,
              },
            ],
          },
        ],
        pagination,
        filters,
        title: 'Organization audit log',
      },
    })

    expect(
      screen.getAllByText(/(?:Custom role|Vai trò tùy chỉnh) · compliance reviewer/i).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('can_view_audit_logs').length).toBeGreaterThan(0)
  })
})
