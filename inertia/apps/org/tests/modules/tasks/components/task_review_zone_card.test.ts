import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import TaskReviewZoneCard from '@/apps/org/modules/tasks/components/detail/task_review_zone_card.svelte'
import type { TaskDetail } from '@/apps/org/modules/tasks/types/index.svelte'

vi.mock('@inertiajs/svelte', () => ({
  Link: ({ children }: { children?: import('svelte').Snippet }) => (children ? children() : ''),
}))

function buildTask(overrides: Partial<TaskDetail> = {}): TaskDetail {
  return {
    id: 'task-1',
    title: 'Task review governance',
    status: 'in_review',
    label: 'feature',
    priority: 'high',
    creator_id: 'creator-1',
    due_date: null,
    created_at: '2026-07-09T10:00:00.000Z',
    updated_at: '2026-07-09T10:00:00.000Z',
    organization_id: 'org-1',
    project_id: 'project-1',
    review_zone: {
      submission_id: 'submission-1',
      submission_status: 'accepted_for_review',
      review_session_id: 'session-1',
      review_session_status: 'in_progress',
      dispute_id: null,
      dispute_status: null,
      creator_review_completed: false,
      manager_reviews_count: 1,
      peer_reviews_count: 1,
      required_total_reviews: 3,
      required_peer_reviews: 2,
      required_pending_assignments: 1,
      optional_pending_assignments: 0,
    },
    ...overrides,
  }
}

describe('TaskReviewZoneCard', () => {
  it('shows required checkpoint summary with creator review tracked separately', () => {
    render(TaskReviewZoneCard, {
      props: {
        task: buildTask(),
      },
    })

    expect(screen.getByText('Checkpoint bắt buộc')).toBeInTheDocument()
    expect(screen.getByText('2/4')).toBeInTheDocument()
    expect(screen.getByText('Còn chờ')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.queryByText('Review queue')).not.toBeInTheDocument()
  })
})
