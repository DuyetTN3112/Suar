/* eslint-disable import-x/order */
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import LinkStub from '../../shared/test_stubs/inertia_link_stub.svelte'

vi.mock('@inertiajs/svelte', () => ({
  Link: LinkStub,
  router: {
    get: vi.fn(),
    visit: vi.fn(),
    reload: vi.fn(),
  },
}))

import AdminDisputesPage from '@/apps/admin/modules/disputes/index.svelte'

describe('AdminDisputesPage', () => {
  it('preserves dispute filters in pagination links', () => {
    render(AdminDisputesPage, {
      props: {
        disputes: [
          {
            id: 'dispute-1',
            review_session_id: 'session-1',
            task_id: 'task-1',
            task_title: 'Audit pagination',
            reviewee_id: 'user-1',
            reviewee_username: 'duyet',
            reviewee_email: 'duyet@example.com',
            status: 'pending',
            dispute_reason: 'Need review',
            requested_outcome: 'recheck',
            created_at: '2026-07-05T12:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'cursor',
          total: 25,
          perPage: 20,
          page: 1,
          lastPage: 2,
          hasNextPage: true,
          hasPreviousPage: true,
          cursor: {
            nextCursor: 'cursor-older',
            previousCursor: 'cursor-newer',
          },
        },
        filters: {
          search: 'duyet',
          status: 'pending',
        },
      },
    })

    expect(screen.getByRole('link', { name: /mới hơn/i })).toHaveAttribute(
      'href',
      '/admin/disputes?status=pending&before=cursor-newer'
    )
    expect(screen.getByRole('link', { name: /cũ hơn/i })).toHaveAttribute(
      'href',
      '/admin/disputes?status=pending&after=cursor-older'
    )
  })

  it('shows human-readable dispute details without leaking raw ids', () => {
    render(AdminDisputesPage, {
      props: {
        disputes: [
          {
            id: '8f1ee6cc-0c1f-4df8-8c9d-263846f3bf5d',
            review_session_id: '4db739ee-2d39-4a6f-845f-6af7bdfb7077',
            task_id: '8d495410-36fa-40af-82b8-cd3d6b69b235',
            task_title: 'Review governance audit',
            reviewee_id: '8cb1d6f5-11d0-4b86-b6a8-67cc1d04f5cf',
            reviewee_username: 'duyet',
            reviewee_email: 'duyet@example.com',
            status: 'pending',
            dispute_reason: 'Need second pass on evidence weighting.',
            requested_outcome: 'request_re_review',
            created_at: '2026-07-05T12:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'cursor',
          total: 1,
          perPage: 20,
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
          search: null,
          status: null,
        },
      },
    })

    expect(screen.getByText('duyet')).toBeInTheDocument()
    expect(screen.getAllByText('Request re-review').length).toBeGreaterThan(0)
    expect(screen.getByText('Pending', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Case #8f1ee6cc')).toBeInTheDocument()
    expect(screen.queryByText('request_re_review')).not.toBeInTheDocument()
    expect(screen.queryByText('8cb1d6f5-11d0-4b86-b6a8-67cc1d04f5cf')).not.toBeInTheDocument()
    expect(screen.queryByText('4db739ee-2d39-4a6f-845f-6af7bdfb7077')).not.toBeInTheDocument()
    expect(screen.queryByText('8f1ee6cc-0c1f-4df8-8c9d-263846f3bf5d')).not.toBeInTheDocument()
  })

  it('labels sprint dispute sources and hierarchy in the admin queue', () => {
    render(AdminDisputesPage, {
      props: {
        disputes: [
          {
            id: 'sprint-dispute-1',
            review_session_id: null,
            task_id: null,
            task_title: null,
            reviewee_id: 'reviewer-1',
            reviewee_username: 'manager',
            reviewee_email: 'manager@example.com',
            status: 'reported',
            source_type: 'sprint_review_dispute',
            dispute_review_type: 'manager_review',
            organization_id: 'org-1',
            project_id: 'project-1',
            project_name: 'Project Mercury',
            sprint_id: 'sprint-1',
            sprint_name: 'Sprint 7',
            dispute_reason: 'Manager review conflicts with sprint record.',
            requested_outcome: 'request_admin_review',
            created_at: '2026-07-05T12:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'cursor',
          total: 1,
          perPage: 20,
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
          search: null,
          status: null,
        },
      },
    })

    expect(screen.getByText('Sprint review')).toBeInTheDocument()
    expect(screen.getByText('manager_review')).toBeInTheDocument()
    expect(screen.getByText('Project Mercury / Sprint 7')).toBeInTheDocument()
    expect(screen.getByText('Project Mercury')).toBeInTheDocument()
  })

  it('labels task review workflow sources separately from classic task review disputes', () => {
    render(AdminDisputesPage, {
      props: {
        disputes: [
          {
            id: 'task-workflow-1',
            review_session_id: null,
            task_id: 'task-1',
            task_title: 'Task under disputed review',
            reviewee_id: 'worker-1',
            reviewee_username: 'worker',
            reviewee_email: 'worker@example.com',
            status: 'reported',
            source_type: 'task_review_workflow',
            dispute_review_type: 'task_review',
            organization_id: 'org-1',
            project_id: 'project-1',
            project_name: 'Project Mercury',
            sprint_id: 'sprint-1',
            sprint_name: 'Sprint 7',
            dispute_reason: 'Review missed peer task evidence.',
            requested_outcome: 'request_admin_review',
            created_at: '2026-07-05T12:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'cursor',
          total: 1,
          perPage: 20,
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
          search: null,
          status: null,
        },
      },
    })

    expect(screen.getByText('Task workflow')).toBeInTheDocument()
    expect(screen.getByText('task_review')).toBeInTheDocument()
    expect(screen.getByText('Project Mercury / Sprint 7')).toBeInTheDocument()
  })

  it('surfaces AI evaluation count in admin queue cards', () => {
    render(AdminDisputesPage, {
      props: {
        disputes: [
          {
            id: 'ai-ready-dispute-1',
            review_session_id: null,
            task_id: 'task-1',
            task_title: 'Task with AI arbitration',
            reviewee_id: 'worker-1',
            reviewee_username: 'worker',
            reviewee_email: 'worker@example.com',
            status: 'admin_reviewing',
            sourceType: 'task_review_workflow',
            disputeReviewType: 'task_review',
            dispute_reason: 'AI has already reviewed this dispute.',
            requested_outcome: 'request_admin_review',
            created_at: '2026-07-05T12:00:00.000Z',
            aiEvaluationsCount: 2,
          },
        ],
        pagination: {
          mode: 'cursor',
          total: 1,
          perPage: 20,
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
          search: null,
          status: null,
        },
      },
    })

    expect(screen.getByText('AI 2 runs')).toBeInTheDocument()
  })

  it('offers filters for reported and AI reviewing dispute lanes', () => {
    render(AdminDisputesPage, {
      props: {
        disputes: [],
        pagination: {
          mode: 'cursor',
          total: 0,
          perPage: 20,
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
          search: null,
          status: null,
        },
      },
    })

    expect(screen.getByRole('tab', { name: 'Reported' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'AI reviewing' })).toBeInTheDocument()
  })
})
