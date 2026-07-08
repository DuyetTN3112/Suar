import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import ReviewShowHeader from '@/apps/user/modules/reviews/components/review_show_header.svelte'
import type { ShowReviewProps } from '@/apps/user/modules/reviews/types.svelte'

function buildSession(
  overrides: Partial<ShowReviewProps['session']> = {}
): ShowReviewProps['session'] {
  return {
    id: 'session-1',
    task_assignment_id: 'assignment-1',
    reviewee_id: 'reviewee-1',
    status: 'in_progress',
    manager_review_completed: true,
    creator_reviewer_id: 'creator-1',
    creator_review_completed: false,
    manager_reviews_count: 1,
    peer_reviews_count: 1,
    required_peer_reviews: 2,
    required_total_reviews: 3,
    minimum_manager_reviews: 1,
    minimum_peer_reviews: 2,
    confirmations: [],
    created_at: '2026-07-09T10:00:00.000Z',
    completed_at: null,
    updated_at: '2026-07-09T10:00:00.000Z',
    reviewee: {
      id: 'reviewee-1',
      username: 'duyet',
      email: 'duyet@example.com',
    },
    task_assignment: {
      id: 'assignment-1',
      task: {
        id: 'task-1',
        title: 'Task review governance',
        project_id: 'project-1',
      },
    },
    reviewer_assignments: [
      {
        id: 'assignment-creator',
        review_session_id: 'session-1',
        reviewer_id: 'creator-1',
        reviewer_type: 'manager',
        assignment_role: 'creator_required',
        is_required: true,
        status: 'pending',
        due_at: null,
        submitted_at: null,
        reviewer: {
          id: 'creator-1',
          username: 'owner',
          email: 'owner@example.com',
        },
      },
    ],
    skill_reviews: [],
    ...overrides,
  }
}

describe('ReviewShowHeader', () => {
  it('explains quorum rule with creator review kept separate from peer quota', () => {
    render(ReviewShowHeader, {
      props: {
        taskTitle: 'Task review governance',
        reviewee: {
          id: 'reviewee-1',
          username: 'duyet',
          email: 'duyet@example.com',
        },
        createdDate: '09/07/2026 17:00',
        completedDate: null,
        session: buildSession(),
      },
    })

    expect(screen.getByText('Quorum:')).toBeInTheDocument()
    expect(screen.getByText(/Luật chốt: creator review riêng \+ 1 manager \+ 2 peer/i)).toBeInTheDocument()
    expect(screen.getByText(/Reviewer bắt buộc còn nợ:/i)).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
