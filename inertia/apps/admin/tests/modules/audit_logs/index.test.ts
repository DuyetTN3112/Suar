import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import AdminAuditLogsPage from '@/apps/admin/modules/audit_logs/index.svelte'

const auditLogProps = {
  auditLogs: [
    {
      id: 'audit-1',
      user: { id: 'user-1', username: 'duyet' },
      action: 'review.dispute.resolved',
      resourceType: 'review_dispute',
      resourceId: 'dispute-1',
      details: {
        oldValues: { status: 'pending', assignee_id: 'user-2' },
        newValues: { status: 'resolved', assignee_id: 'user-1' },
      },
      ipAddress: '127.0.0.1',
      userAgent: 'integration-test',
      createdAt: '2026-07-05T12:00:00.000Z',
      investigation: {
        isStructured: true,
        eventName: 'review.dispute.resolved',
        eventFamily: 'workflow',
        module: 'reviews',
        subsystem: 'review_dispute',
        workflow: 'review_dispute_resolution',
        stage: 'completed',
        severity: 'info',
        outcome: 'success',
        traceId: 'trace-1',
        correlationKey: 'corr-1',
        frontendSubmissionId: 'submission-1',
        requestId: 'req-1',
        initiatorType: 'user',
        actorUserId: 'user-1',
        actorOrganizationId: 'org-1',
        targetType: 'review_dispute',
        targetId: 'dispute-1',
        targetScope: 'review_dispute_resolution',
        retentionClass: 'support_trace',
        durationMs: 120,
        errorClass: null,
        errorMessage: null,
        summary: 'Review dispute resolved',
      },
    },
  ],
  pagination: {
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
  },
  filters: {
    search: '',
    action: null,
    resourceType: null,
    userId: null,
    from: null,
    to: null,
    after: null,
  },
}

const paginatedAuditLogProps = {
  ...auditLogProps,
  pagination: {
    ...auditLogProps.pagination,
    total: 65,
    lastPage: 2,
    hasNextPage: true,
    cursor: {
      ...auditLogProps.pagination.cursor,
      nextCursor: 'cursor-older',
    },
  },
}

describe('AdminAuditLogsPage', () => {
  it('renders a focused audit log list without duplicated workspace navigation', () => {
    render(AdminAuditLogsPage, {
      props: auditLogProps,
    })

    expect(screen.getByRole('heading', { name: /Audit log hệ thống/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Hành động/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Loại/i)).toBeInTheDocument()
    expect(screen.queryByText(/Phạm vi xem/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Tín hiệu hoạt động/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Event đang chọn/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/Review dispute resolved/i).length).toBeGreaterThan(0)
  })

  it('keeps the list full-width and uses unified cursor pagination before a row is selected', () => {
    render(AdminAuditLogsPage, {
      props: paginatedAuditLogProps,
    })

    expect(screen.getByTestId('audit-log-results-grid')).toHaveClass('xl:grid-cols-1')
    const listPanel = screen.getByTestId('audit-log-list-panel')
    const listPagination = within(listPanel).getByTestId('audit-log-list-pagination')
    expect(within(listPagination).getByText('1-50 / 65')).toBeInTheDocument()
    expect(within(listPagination).getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cũ hơn/i })).toBeEnabled()
  })

  it('opens a useful detail panel for the selected audit row', async () => {
    render(AdminAuditLogsPage, {
      props: auditLogProps,
    })

    await fireEvent.click(screen.getByRole('button', { name: /Review dispute resolved/i }))

    const detailPanel = screen.getByLabelText(/Chi tiết audit/i)
    expect(within(detailPanel).getByRole('heading', { name: /Chi tiết audit/i })).toBeInTheDocument()
    expect(within(detailPanel).getByText('trace-1')).toBeInTheDocument()
    expect(within(detailPanel).getByText('req-1')).toBeInTheDocument()
    expect(within(detailPanel).getByText('127.0.0.1')).toBeInTheDocument()
    expect(within(detailPanel).getByText('integration-test')).toBeInTheDocument()
    expect(within(detailPanel).getByText('review_dispute')).toBeInTheDocument()
    expect(within(detailPanel).getByText('dispute-1')).toBeInTheDocument()
    expect(within(detailPanel).getByText(/pending → resolved/i)).toBeInTheDocument()
    expect(within(detailPanel).getByText(/user-2 → user-1/i)).toBeInTheDocument()
  })
})
