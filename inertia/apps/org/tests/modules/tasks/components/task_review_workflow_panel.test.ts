import { fireEvent, render, screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const inertiaMocks = vi.hoisted(() => ({
  router: {
    post: vi.fn(),
  },
}))

vi.mock('@inertiajs/svelte', () => ({
  router: inertiaMocks.router,
}))

import TaskReviewWorkflowPanel from '@/apps/org/modules/tasks/components/detail/task_review_workflow_panel.svelte'

describe('Org TaskReviewWorkflowPanel', () => {
  beforeEach(() => {
    inertiaMocks.router.post.mockClear()
  })

  it('keeps task review actions on the organization task detail route', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/org/tasks/task-1',
        detail: {
          task: {
            assigned_to: 'worker-1',
          },
          workflow: null,
          reviewers: [],
          comments: [],
          reviewMessages: [],
        },
      },
    })

    await fireEvent.input(screen.getByLabelText('Nhập review'), {
      target: { value: 'Evidence accepted.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi review/i }))

    expect(inertiaMocks.router.post).toHaveBeenCalledWith('/task-reviews/tasks/task-1/reviews', {
      body: 'Evidence accepted.',
      project_id: 'project-1',
      redirect_to: '/org/tasks/task-1',
    })
  })

  it('lets the reviewee accept or respond from organization task detail', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'worker-1',
        taskDetailUrl: '/org/tasks/task-1',
        detail: {
          task: {
            assigned_to: 'worker-1',
          },
          workflow: {
            id: 'workflow-1',
            status: 'awaiting_response',
            completed_review_count: 2,
            required_review_count: 2,
          },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer',
              reviewer_role: 'peer',
              status: 'submitted',
              priority_rank: 1,
            },
          ],
          comments: [],
          reviewMessages: [],
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Đồng ý review/i }))
    await fireEvent.input(screen.getByLabelText('Phản hồi/tranh luận'), {
      target: { value: 'Need one clarification.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi phản hồi/i }))

    expect(inertiaMocks.router.post).toHaveBeenCalledWith('/task-reviews/workflow-1/accept', {
      project_id: 'project-1',
      task_id: 'task-1',
      redirect_to: '/org/tasks/task-1',
    })
    expect(inertiaMocks.router.post).toHaveBeenCalledWith('/task-reviews/workflow-1/respond', {
      body: 'Need one clarification.',
      project_id: 'project-1',
      task_id: 'task-1',
      redirect_to: '/org/tasks/task-1',
    })
  })
})
