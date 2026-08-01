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

import TaskReviewWorkflowPanel from '@/apps/user/modules/tasks/components/detail/task_review_workflow_panel.svelte'

describe('TaskReviewWorkflowPanel', () => {
  beforeEach(() => {
    inertiaMocks.router.post.mockClear()
    inertiaMocks.router.post.mockReset()
  })

  it('lets the task creator submit the first review before the workflow exists', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'creator-1',
        taskDetailUrl: '/projects/project-1/reviews/tasks?task_id=task-1',
        detail: {
          task: {
            assigned_to: 'worker-1',
            creator_id: 'creator-1',
          },
          workflow: null,
          reviewers: [],
          comments: [],
          reviewMessages: [],
        },
      },
    })

    await fireEvent.input(screen.getByLabelText('Nhập review'), {
      target: { value: 'First review opens the governed workflow.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi review/i }))

    expect(inertiaMocks.router.post).toHaveBeenCalledWith(
      '/task-reviews/tasks/task-1/reviews',
      {
        body: 'First review opens the governed workflow.',
        project_id: 'project-1',
        redirect_to: '/projects/project-1/reviews/tasks?task_id=task-1',
      },
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )
  })

  it('lets an eligible reviewer submit from task detail and stay on task detail', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/tasks/task-1',
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
        redirect_to: '/tasks/task-1',
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
        taskDetailUrl: '/tasks/task-1',
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
        redirect_to: '/tasks/task-1',
      },
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )
  })

  it('does not offer review submission to someone outside the fixed reviewer roster', () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'stranger-1',
        taskDetailUrl: '/tasks/task-1',
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

    expect(screen.queryByLabelText('Nhập review')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Gửi review/i })).not.toBeInTheDocument()
  })

  it('lets the reviewee accept or respond from task detail', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'worker-1',
        taskDetailUrl: '/tasks/task-1',
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
        redirect_to: '/tasks/task-1',
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
        redirect_to: '/tasks/task-1',
      },
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )
  })

  it('shows an inline submit failure and keeps the review draft', async () => {
    inertiaMocks.router.post.mockImplementation((_url, _data, options) => {
      options?.onError?.({ body: 'Reviewer already submitted this task.' })
    })

    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/tasks/task-1',
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

    const textarea = screen.getByLabelText('Nhập review')
    await fireEvent.input(textarea, {
      target: { value: 'Keep this review draft.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi review/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('Reviewer already submitted this task.')
    expect(textarea).toHaveValue('Keep this review draft.')
  })

  it('shows inline accept and response failures while preserving the response draft', async () => {
    inertiaMocks.router.post.mockImplementation((_url, _data, options) => {
      options?.onError?.({ message: 'The review workflow changed. Refresh and try again.' })
    })

    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'worker-1',
        taskDetailUrl: '/tasks/task-1',
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

    const textarea = screen.getByLabelText('Phản hồi/tranh luận')
    await fireEvent.input(textarea, {
      target: { value: 'Keep this response draft.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Đồng ý review/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('The review workflow changed. Refresh and try again.')
    expect(textarea).toHaveValue('Keep this response draft.')

    await fireEvent.click(screen.getByRole('button', { name: /Gửi phản hồi/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('The review workflow changed. Refresh and try again.')
    expect(textarea).toHaveValue('Keep this response draft.')
  })

  it('shows an inline report failure and keeps the dispute draft', async () => {
    inertiaMocks.router.post.mockImplementation((_url, _data, options) => {
      options?.onError?.({ reason: 'A dispute report is already open.' })
    })

    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/tasks/task-1',
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

    const textarea = screen.getByLabelText('Gửi report tranh chấp')
    await fireEvent.input(textarea, {
      target: { value: 'Keep this dispute draft.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi report/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('A dispute report is already open.')
    expect(textarea).toHaveValue('Keep this dispute draft.')
  })
})
