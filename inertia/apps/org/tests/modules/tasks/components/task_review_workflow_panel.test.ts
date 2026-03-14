import { fireEvent, render, screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type InertiaPostOptions = {
  onError?: (errors: Record<string, string | string[] | undefined>) => void
}

type InertiaPost = (
  url: string,
  data: Record<string, unknown>,
  options?: InertiaPostOptions
) => void

const inertiaMocks = vi.hoisted(() => ({
  router: {
    post: vi.fn<InertiaPost>(),
  },
}))

vi.mock('@inertiajs/svelte', () => ({
  router: inertiaMocks.router,
}))

import TaskReviewWorkflowPanel from '@/apps/org/modules/tasks/components/detail/task_review_workflow_panel.svelte'

describe('Org TaskReviewWorkflowPanel', () => {
  beforeEach(() => {
    inertiaMocks.router.post.mockClear()
    inertiaMocks.router.post.mockReset()
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
          workflow: {
            id: 'workflow-1',
            status: 'awaiting_review',
            completed_review_count: 0,
            required_review_count: 2,
          },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer',
              reviewer_role: 'peer',
              status: 'pending',
              priority_rank: 1,
            },
          ],
          comments: [],
          reviewMessages: [],
        },
      },
    })

    await fireEvent.input(screen.getByLabelText('Nhập review'), {
      target: { value: 'Evidence accepted.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi review/i }))

    expect(inertiaMocks.router.post).toHaveBeenCalledWith(
      '/task-reviews/tasks/task-1/reviews',
      {
        body: 'Evidence accepted.',
        project_id: 'project-1',
        redirect_to: '/org/tasks/task-1',
      },
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )
  })

  it('lets the next pending reviewer submit while the workflow is in review', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-2',
        taskDetailUrl: '/org/tasks/task-1',
        detail: {
          task: {
            assigned_to: 'worker-1',
          },
          workflow: {
            id: 'workflow-1',
            status: 'in_review',
            completed_review_count: 1,
            required_review_count: 2,
          },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer 1',
              reviewer_role: 'peer',
              status: 'submitted',
              priority_rank: 1,
            },
            {
              reviewer_id: 'reviewer-2',
              reviewer_name: 'Reviewer 2',
              reviewer_role: 'peer',
              status: 'pending',
              priority_rank: 2,
            },
          ],
          comments: [],
          reviewMessages: [],
        },
      },
    })

    await fireEvent.input(screen.getByLabelText('Nhập review'), {
      target: { value: 'Second reviewer can still submit.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi review/i }))

    expect(inertiaMocks.router.post).toHaveBeenCalledWith(
      '/task-reviews/tasks/task-1/reviews',
      {
        body: 'Second reviewer can still submit.',
        project_id: 'project-1',
        redirect_to: '/org/tasks/task-1',
      },
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )
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

    expect(inertiaMocks.router.post).toHaveBeenCalledWith(
      '/task-reviews/workflow-1/accept',
      {
        project_id: 'project-1',
        task_id: 'task-1',
        redirect_to: '/org/tasks/task-1',
      },
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )
    expect(inertiaMocks.router.post).toHaveBeenCalledWith(
      '/task-reviews/workflow-1/respond',
      {
        body: 'Need one clarification.',
        project_id: 'project-1',
        task_id: 'task-1',
        redirect_to: '/org/tasks/task-1',
      },
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )
  })

  it('shows inline failures for task review mutations without clearing drafts', async () => {
    inertiaMocks.router.post.mockImplementation((_url, _data, options) => {
      options?.onError?.({ message: 'Organization review action was refused.' })
    })

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
          workflow: {
            id: 'workflow-1',
            status: 'awaiting_review',
            completed_review_count: 0,
            required_review_count: 2,
          },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer',
              reviewer_role: 'peer',
              status: 'pending',
              priority_rank: 1,
            },
          ],
          comments: [],
          reviewMessages: [],
        },
      },
    })

    const reviewTextarea = screen.getByLabelText('Nhập review')
    await fireEvent.input(reviewTextarea, {
      target: { value: 'Keep org review draft.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi review/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('Organization review action was refused.')
    expect(reviewTextarea).toHaveValue('Keep org review draft.')
  })

  it('shows inline report failures and preserves the organization dispute draft', async () => {
    inertiaMocks.router.post.mockImplementation((_url, _data, options) => {
      options?.onError?.({ reason: 'Organization dispute report was refused.' })
    })

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
          workflow: {
            id: 'workflow-1',
            status: 'disputed',
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

    const reportTextarea = screen.getByLabelText('Gửi report tranh chấp')
    await fireEvent.input(reportTextarea, {
      target: { value: 'Keep org dispute draft.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi report/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('Organization dispute report was refused.')
    expect(reportTextarea).toHaveValue('Keep org dispute draft.')
  })
})
