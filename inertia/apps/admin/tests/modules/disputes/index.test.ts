import { render, screen, within } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import AdminDisputesPage from '@/apps/admin/modules/disputes/index.svelte'

vi.mock('@inertiajs/svelte', async () => {
  const linkStubModule = await import('../../shared/test_stubs/inertia_link_stub.svelte')
  return {
    Link: linkStubModule.default,
    router: {
      get: vi.fn(),
      visit: vi.fn(),
      reload: vi.fn(),
    },
  }
})

vi.unmock('@/apps/admin/shared/stores/translation.svelte')

type Dispute = {
  id: string
  task_title: string | null
  reviewee_username: string | null
  reviewee_email: string | null
  status: string
  dispute_reason: string
  requested_outcome: string
  created_at: string
  project_name?: string | null
  sprint_name?: string | null
  aiEvaluationsCount?: number
  last_error_message?: string | null
}

function dispute(overrides: Partial<Dispute>): Dispute {
  return {
    id: 'dispute-1',
    task_title: 'Review governance audit',
    reviewee_username: 'duyet',
    reviewee_email: 'duyet@example.com',
    status: 'pending',
    dispute_reason: 'Need a second pass on the available evidence.',
    requested_outcome: 'request_admin_review',
    created_at: '2026-07-05T12:00:00.000Z',
    ...overrides,
  }
}

function renderBoard(
  disputes: Dispute[] = [],
  paginationOverrides: Record<string, unknown> = {},
  status: string | null = null
) {
  return render(AdminDisputesPage, {
    props: {
      disputes,
      pagination: {
        mode: 'cursor',
        total: disputes.length,
        perPage: 20,
        page: 1,
        lastPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        cursor: {
          nextCursor: null,
          previousCursor: null,
        },
        ...paginationOverrides,
      },
      filters: {
        search: null,
        status,
      },
    },
  })
}

describe('AdminDisputesPage', () => {
  it('renders the single System Admin dispute progress board with the five operational lanes', () => {
    renderBoard()

    expect(screen.getByRole('heading', { name: 'AI dispute progress board' })).toBeInTheDocument()

    for (const lane of [
      'Pending',
      'AI reviewing',
      'AI processing failed — retry required',
      'Admin reviewing',
      'Resolved',
    ]) {
      expect(screen.getByRole('heading', { name: lane })).toBeInTheDocument()
    }

    for (const retiredLane of ['Collecting evidence', 'Reported', 'Rejected', 'Cancelled']) {
      expect(screen.queryByRole('heading', { name: retiredLane })).not.toBeInTheDocument()
    }
  })

  it('maps submitted and legacy cases into the operational lanes and opens the case room', () => {
    renderBoard([
      dispute({
        id: 'reported-case',
        task_title: 'Reported task review',
        status: 'reported',
      }),
      dispute({
        id: 'evidence-case',
        task_title: 'Legacy evidence case',
        status: 'collecting_evidence',
      }),
      dispute({
        id: 'ai-case',
        task_title: 'AI arbitration in progress',
        status: 'ai_reviewing',
        aiEvaluationsCount: 2,
      }),
      dispute({
        id: 'failed-ai-case',
        task_title: 'AI arbitration failed',
        status: 'ai_failed',
        last_error_message: 'HTTP 429 quota exceeded',
      }),
      dispute({
        id: 'resolved-case',
        task_title: 'Closed review dispute',
        status: 'resolved',
      }),
      dispute({
        id: 'rejected-case',
        task_title: 'Rejected review dispute',
        status: 'rejected',
      }),
      dispute({
        id: 'done-task-review-workflow',
        task_title: 'Finalized task review workflow',
        status: 'done',
      }),
    ])

    const pendingLane = screen.getByRole('heading', { name: 'Pending' }).closest('section')
    const aiLane = screen.getByRole('heading', { name: 'AI reviewing' }).closest('section')
    const aiFailedLane = screen
      .getByRole('heading', { name: 'AI processing failed — retry required' })
      .closest('section')
    const resolvedLane = screen.getByRole('heading', { name: 'Resolved' }).closest('section')

    expect(pendingLane).not.toBeNull()
    expect(aiLane).not.toBeNull()
    expect(resolvedLane).not.toBeNull()
    if (!pendingLane || !aiLane || !aiFailedLane || !resolvedLane) {
      throw new Error('Expected every dispute case to have a matching Kanban lane')
    }
    expect(within(pendingLane).getByText('Reported task review')).toBeInTheDocument()
    expect(within(pendingLane).getByText('Legacy evidence case')).toBeInTheDocument()
    expect(within(aiLane).getByText('AI arbitration in progress')).toBeInTheDocument()
    expect(within(aiLane).getByText('2')).toBeInTheDocument()
    expect(within(aiFailedLane).getByText('AI arbitration failed')).toBeInTheDocument()
    expect(within(aiFailedLane).getByText('Retry AI')).toBeInTheDocument()
    expect(within(aiFailedLane).getByText(/quota was reached/i)).toBeInTheDocument()
    expect(within(resolvedLane).getByText('Closed review dispute')).toBeInTheDocument()
    expect(within(resolvedLane).getByText('Rejected review dispute')).toBeInTheDocument()
    expect(within(resolvedLane).getByText('Finalized task review workflow')).toBeInTheDocument()
    expect(within(resolvedLane).getByText('Đã hoàn tất')).toBeInTheDocument()
    expect(within(resolvedLane).getByText('Rejected')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /AI arbitration in progress/i })).toHaveAttribute(
      'href',
      '/admin/disputes/ai-case'
    )
  })

  it('keeps project and sprint context on the board card', () => {
    renderBoard([
      dispute({
        id: 'sprint-case',
        task_title: null,
        project_name: 'Project Mercury',
        sprint_name: 'Sprint 7',
        status: 'reported',
      }),
    ])

    expect(screen.getByText('Project Mercury / Sprint 7')).toBeInTheDocument()
  })

  it('classifies a provider 503 as temporary model overload instead of an API-key failure', () => {
    renderBoard([
      dispute({
        status: 'ai_failed',
        last_error_message:
          'LLM call failed with HTTP 503: {"error":{"status":"UNAVAILABLE","message":"This model is currently experiencing high demand."}}',
      }),
    ])

    const failedLane = screen.getByRole('heading', { name: 'AI processing failed — retry required' }).closest('section')
    expect(failedLane).not.toBeNull()
    if (!failedLane) throw new Error('Expected failed lane')
    expect(within(failedLane).getByText('Model AI đang quá tải tạm thời')).toBeInTheDocument()
    expect(within(failedLane).getByText(/Không cần đổi SUAR_DISPUTE_API_KEY/i)).toBeInTheDocument()
    expect(within(failedLane).getAllByText(/HTTP 503/).length).toBeGreaterThan(0)
  })

  it('preserves the selected status while paging through the board window', () => {
    renderBoard(
      [dispute({ status: 'reported' })],
      {
        total: 25,
        lastPage: 2,
        hasNextPage: true,
        hasPreviousPage: true,
        cursor: {
          nextCursor: 'cursor-older',
          previousCursor: 'cursor-newer',
        },
      },
      'reported'
    )

    expect(screen.getByRole('link', { name: /newer/i })).toHaveAttribute(
      'href',
      '/admin/disputes?status=reported&before=cursor-newer'
    )
    expect(screen.getByRole('link', { name: /older/i })).toHaveAttribute(
      'href',
      '/admin/disputes?status=reported&after=cursor-older'
    )
  })
})
