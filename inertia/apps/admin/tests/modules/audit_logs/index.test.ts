import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

vi.unmock('@/apps/admin/shared/stores/translation.svelte')

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
        actorRoleSurface: 'system_admin',
        targetType: 'review_dispute',
        targetId: 'dispute-1',
        targetLabel: 'Release policy dispute',
        targetOrganizationId: 'org-1',
        targetScope: 'review_dispute_resolution',
        retentionClass: 'support_trace',
        durationMs: 120,
        errorClass: null,
        errorMessage: null,
        integrity: {
          status: 'verified' as const,
          eventHash: 'a'.repeat(64),
          previousHash: 'b'.repeat(64),
          schemaVersion: 2,
          redactionApplied: true,
          defensiveRedactionApplied: false,
        },
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

    expect(screen.getByRole('heading', { name: /System audit log/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Action$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Target type/i)).toBeInTheDocument()
    expect(screen.getByText(/Platform-wide system evidence/i)).toBeInTheDocument()
    expect(screen.getByText(/Integrity alerts/i)).toBeInTheDocument()
    expect(screen.queryByText(/View scope/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Activity signals/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Selected event/i)).not.toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: /Older/i })).toBeEnabled()
  })

  it('opens a useful detail panel for the selected audit row', async () => {
    render(AdminAuditLogsPage, {
      props: auditLogProps,
    })

    await fireEvent.click(screen.getByRole('button', { name: /Review dispute resolved/i }))

    const detailPanel = screen.getByLabelText(/System audit evidence detail/i)
    expect(
      within(detailPanel).getByRole('heading', { name: /Review dispute resolved/i })
    ).toBeInTheDocument()
    expect(within(detailPanel).getByLabelText(/Accountability context/i)).toBeInTheDocument()
    expect(within(detailPanel).getByText(/Change evidence/i)).toBeInTheDocument()
    expect(within(detailPanel).getByText(/Payload & integrity/i)).toBeInTheDocument()
    expect(within(detailPanel).getAllByText(/^Verified$/i).length).toBeGreaterThan(0)
    expect(within(detailPanel).getAllByText('trace-1').length).toBeGreaterThan(0)
    expect(within(detailPanel).getAllByText('req-1').length).toBeGreaterThan(0)
    expect(within(detailPanel).getByText('127.0.0.1')).toBeInTheDocument()
    expect(within(detailPanel).getByText('integration-test')).toBeInTheDocument()
    expect(within(detailPanel).getAllByText('review_dispute').length).toBeGreaterThan(0)
    expect(within(detailPanel).getByText('dispute-1')).toBeInTheDocument()
    expect(within(detailPanel).getByText('pending')).toBeInTheDocument()
    expect(within(detailPanel).getByText('resolved')).toBeInTheDocument()
    expect(within(detailPanel).getByText('user-2')).toBeInTheDocument()
    expect(within(detailPanel).getAllByText('user-1').length).toBeGreaterThan(0)
    expect(within(detailPanel).getByText('a'.repeat(64))).toBeInTheDocument()

    await fireEvent.click(within(detailPanel).getByRole('button', { name: /Close/i }))
    await waitFor(() => {
      expect(screen.queryByLabelText(/System audit evidence detail/i)).not.toBeInTheDocument()
      expect(document.body.style.overflow).not.toBe('hidden')
    })
  })
})
