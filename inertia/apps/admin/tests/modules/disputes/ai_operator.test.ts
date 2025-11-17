/* eslint-disable import-x/order */
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import LinkStub from '../../shared/test_stubs/inertia_link_stub.svelte'

vi.mock('@inertiajs/svelte', () => ({
  Link: LinkStub,
  router: {
    get: vi.fn(),
  },
}))

import AdminDisputesAiOperatorPage from '@/apps/admin/modules/disputes/ai_operator.svelte'

describe('AdminDisputesAiOperatorPage', () => {
  it('renders unified pagination and preserves filters for dispute queue', () => {
    render(AdminDisputesAiOperatorPage, {
      props: {
        disputes: [
          {
            id: 'dispute-1',
            task_title: 'Review Task',
            reviewee_username: 'duyet',
            status: 'ai_reviewing',
            latest_case_version: 2,
            ai_evaluations_count: 1,
            created_at: '2026-07-01T00:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'offset',
          page: 2,
          perPage: 25,
          total: 60,
          lastPage: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
        filters: {
          search: 'review',
          status: 'ai_reviewing',
        },
        aiMetrics: {
          totalEvaluations: 4,
          activeEvaluations: 1,
          completedEvaluations: 3,
          failedEvaluations: 0,
          queuedDisputes: 1,
          providers: [],
        },
      },
    })

    expect(screen.getByText('26-50 / 60')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /previous page/i })).toHaveAttribute(
      'href',
      '/admin/disputes/ai-operator?search=review&status=ai_reviewing&page=1'
    )
  })

  it('shows runtime package instead of v0 case file for non-classic dispute sources', () => {
    render(AdminDisputesAiOperatorPage, {
      props: {
        disputes: [
          {
            id: 'reverse-dispute-1',
            task_title: null,
            reviewee_username: 'lead',
            status: 'ai_reviewing',
            source_type: 'sprint_reverse_review_workflow',
            dispute_review_type: 'environment_review',
            project_name: 'Project Mercury',
            sprint_name: 'Sprint 7',
            latest_case_version: null,
            ai_evaluations_count: 1,
            created_at: '2026-07-01T00:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'offset',
          page: 1,
          perPage: 25,
          total: 1,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        filters: {
          search: null,
          status: null,
        },
        aiMetrics: {
          totalEvaluations: 1,
          activeEvaluations: 1,
          completedEvaluations: 0,
          failedEvaluations: 0,
          queuedDisputes: 1,
          providers: [],
        },
      },
    })

    expect(screen.getByText('Reverse review')).toBeInTheDocument()
    expect(screen.getByText('environment_review')).toBeInTheDocument()
    expect(screen.getByText('Runtime package')).toBeInTheDocument()
    expect(screen.queryByText('v0')).not.toBeInTheDocument()
  })

  it('shows task workflow runtime package for task review workflow sources', () => {
    render(AdminDisputesAiOperatorPage, {
      props: {
        disputes: [
          {
            id: 'task-workflow-1',
            task_title: 'Task under disputed review',
            reviewee_username: 'worker',
            status: 'ai_reviewing',
            source_type: 'task_review_workflow',
            dispute_review_type: 'task_review',
            project_name: 'Project Mercury',
            sprint_name: 'Sprint 7',
            latest_case_version: null,
            ai_evaluations_count: 1,
            created_at: '2026-07-01T00:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'offset',
          page: 1,
          perPage: 25,
          total: 1,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        filters: {
          search: null,
          status: null,
        },
        aiMetrics: {
          totalEvaluations: 1,
          activeEvaluations: 1,
          completedEvaluations: 0,
          failedEvaluations: 0,
          queuedDisputes: 1,
          providers: [],
        },
      },
    })

    expect(screen.getByText('Task workflow')).toBeInTheDocument()
    expect(screen.getByText('task_review')).toBeInTheDocument()
    expect(screen.getByText('Runtime package')).toBeInTheDocument()
    expect(screen.queryByText('v0')).not.toBeInTheDocument()
  })
})
