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
  it('renders the single System Admin dispute progress board with all workflow lanes', () => {
    renderBoard()

    expect(screen.getByRole('heading', { name: 'AI dispute progress board' })).toBeInTheDocument()

    for (const lane of [
      'Pending',
      'Collecting evidence',
      'Reported',
      'Admin reviewing',
      'AI reviewing',
      'Resolved',
      'Rejected',
      'Cancelled',
    ]) {
      expect(screen.getByRole('heading', { name: lane })).toBeInTheDocument()
    }
  })

  it('places each case in its status lane and opens the case room from the card', () => {
    renderBoard([
      dispute({
        id: 'reported-case',
        task_title: 'Reported task review',
        status: 'reported',
      }),
      dispute({
        id: 'ai-case',
        task_title: 'AI arbitration in progress',
        status: 'ai_reviewing',
        aiEvaluationsCount: 2,
      }),
      dispute({
        id: 'resolved-case',
        task_title: 'Closed review dispute',
        status: 'resolved',
      }),
    ])

    const reportedLane = screen.getByRole('heading', { name: 'Reported' }).closest('section')
    const aiLane = screen.getByRole('heading', { name: 'AI reviewing' }).closest('section')
    const resolvedLane = screen.getByRole('heading', { name: 'Resolved' }).closest('section')

    expect(reportedLane).not.toBeNull()
    expect(aiLane).not.toBeNull()
    expect(resolvedLane).not.toBeNull()
    if (!reportedLane || !aiLane || !resolvedLane) {
      throw new Error('Expected every dispute case to have a matching Kanban lane')
    }
    expect(within(reportedLane).getByText('Reported task review')).toBeInTheDocument()
    expect(within(aiLane).getByText('AI arbitration in progress')).toBeInTheDocument()
    expect(within(aiLane).getByText('2')).toBeInTheDocument()
    expect(within(resolvedLane).getByText('Closed review dispute')).toBeInTheDocument()
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
