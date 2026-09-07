import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import SprintReverseReviewBoard from '@/apps/user/modules/reviews/sprint-reverse-board.svelte'

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/shared/stores/translation.svelte', async () => {
  return import('#tests/frontend/translation_mock')
})

vi.mock('@inertiajs/svelte', () => ({
  router: {
    post: vi.fn(),
  },
}))

type Status =
  | 'awaiting_review'
  | 'in_review'
  | 'awaiting_response'
  | 'disputed'
  | 'reported'
  | 'ai_reviewing'
  | 'resolved'
  | 'done'

const statuses: Status[] = [
  'awaiting_review',
  'in_review',
  'awaiting_response',
  'disputed',
  'reported',
  'ai_reviewing',
  'resolved',
  'done',
]

function makeCard(
  status: Status,
  username: string,
  overrides: Partial<ReturnType<typeof makeCardBase>> = {}
) {
  return {
    ...makeCardBase(status, username),
    ...overrides,
  }
}

function makeCardBase(status: Status, username: string) {
  return {
    id: `workflow-${status}`,
    sprint_id: 'sprint-1',
    project_id: 'project-1',
    organization_id: 'org-1',
    reviewer_id: 'reviewer-1',
    target_type: 'assigner' as const,
    target_user_id: `target-${status}`,
    target_entity_id: null,
    responder_id: 'responder-1',
    status,
    rating: null,
    comment: null as string | null,
    related_task_count: 0,
    related_tasks: [],
    reviewer: null,
    target_user: {
      id: `target-${status}`,
      username,
      email: null,
    },
    responder: null,
    updated_at: '2026-07-14T01:00:00.000Z',
  }
}

function makeColumns(cardsByStatus: Partial<Record<Status, ReturnType<typeof makeCard>[]>> = {}) {
  return Object.fromEntries(
    statuses.map((status) => [
      status,
      {
        status,
        title: status,
        cards: cardsByStatus[status] ?? [],
      },
    ])
  ) as Record<Status, { status: Status; title: string; cards: ReturnType<typeof makeCard>[] }>
}

describe('User sprint reverse review board', () => {
  it('hides AI reviewing and resolved workflow cards from user review boards', () => {
    render(SprintReverseReviewBoard, {
      props: {
        actorUserId: 'reviewer-1',
        sprintId: 'sprint-1',
        selectedWorkflowId: null,
        reviewWindow: {
          sprintId: 'sprint-1',
          sprintName: 'Sprint July 2026',
          activeSprintId: null,
          activeSprintName: null,
          reviewOpenedAt: '2026-07-14T01:00:00.000Z',
        },
        reviewType: 'manager',
        targetType: 'assigner',
        board: {
          assigner: {
            columns: makeColumns({
              ai_reviewing: [makeCard('ai_reviewing', 'AI queued case')],
              resolved: [makeCard('resolved', 'Resolved case')],
            }),
          },
          environment: {
            columns: makeColumns(),
          },
        },
      },
    })

    expect(screen.queryByText('AI queued case')).not.toBeInTheDocument()
    expect(screen.queryByText('Resolved case')).not.toBeInTheDocument()
  })

  it('does not show responder actions to the reviewer on an awaiting-response card', () => {
    render(SprintReverseReviewBoard, {
      props: {
        actorUserId: 'reviewer-1',
        sprintId: 'sprint-1',
        selectedWorkflowId: 'workflow-awaiting_response',
        reviewWindow: null,
        reviewType: 'manager',
        targetType: 'assigner',
        board: {
          assigner: {
            columns: makeColumns({
              awaiting_response: [
                makeCard('awaiting_response', 'Reviewed manager', {
                  comment: 'Please respond to this review.',
                  responder_id: 'responder-1',
                }),
              ],
            }),
          },
          environment: {
            columns: makeColumns(),
          },
        },
      },
    })

    expect(screen.queryByText('Ghi nhận')).not.toBeInTheDocument()
    expect(screen.queryByText('Mở tranh chấp')).not.toBeInTheDocument()
    expect(screen.getByText('Please respond to this review.')).toBeInTheDocument()
  })
})
