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
import { createMockTaskReviewDetail } from '@/apps/shared/tests/tasks/support/task_review_workflow_test_support'

describe('Org TaskReviewWorkflowPanel - Reviews & Workflow', () => {
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
        detail: createMockTaskReviewDetail(),
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
        detail: createMockTaskReviewDetail({
          workflow: { id: 'workflow-1', status: 'in_review', completed_review_count: 1, required_review_count: 2 },
          reviewers: [
            { reviewer_id: 'reviewer-1', reviewer_name: 'Reviewer 1', reviewer_role: 'peer', status: 'submitted', priority_rank: 1 },
            { reviewer_id: 'reviewer-2', reviewer_name: 'Reviewer 2', reviewer_role: 'peer', status: 'pending', priority_rank: 2 },
          ],
          reviewMessages: [
            { id: 'review-1', author_id: 'reviewer-1', author_name: 'Reviewer', message_type: 'review', body: 'Please clarify.', created_at: '2026-08-01T00:00:00.000Z' },
          ],
        }),
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
        detail: createMockTaskReviewDetail({
          workflow: { id: 'workflow-1', status: 'awaiting_response', completed_review_count: 2, required_review_count: 2 },
          reviewers: [
            { reviewer_id: 'reviewer-1', reviewer_name: 'Reviewer', reviewer_role: 'peer', status: 'submitted', priority_rank: 1 },
          ],
          reviewMessages: [
            { id: 'review-1', author_id: 'reviewer-1', author_name: 'Reviewer', message_type: 'review', body: 'Please clarify.', created_at: '2026-08-01T00:00:00.000Z' },
          ],
        }),
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Phản hồi đánh giá/i }))
    await fireEvent.input(screen.getByLabelText('Phản hồi/tranh luận'), {
      target: { value: 'Need one clarification.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi phản hồi/i }))

    expect(inertiaMocks.router.post).toHaveBeenCalledWith(
      '/task-reviews/workflow-1/respond',
      {
        body: 'Need one clarification.',
        review_message_id: 'review-1',
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
        detail: createMockTaskReviewDetail(),
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
        detail: createMockTaskReviewDetail({
          workflow: { id: 'workflow-1', status: 'awaiting_response', completed_review_count: 2, required_review_count: 2 },
          reviewers: [
            { reviewer_id: 'reviewer-1', reviewer_name: 'Reviewer', reviewer_role: 'peer', status: 'submitted', priority_rank: 1 },
          ],
          reviewMessages: [
            { id: 'review-1', author_id: 'reviewer-1', author_name: 'Reviewer', message_type: 'review', body: 'Please clarify.', created_at: '2026-08-01T00:00:00.000Z' },
            { id: 'response-1', parent_review_message_id: 'review-1', author_id: 'worker-1', author_name: 'Worker', message_type: 'reviewee_response', body: 'Here is the clarification.', created_at: '2026-08-01T01:00:00.000Z' },
          ],
        }),
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Gửi báo cáo tranh chấp/i }))
    const claimTextarea = screen.getByRole('textbox', { name: 'Dispute claim' })
    const evidenceTextarea = screen.getByRole('textbox', { name: 'Dispute evidence' })
    await fireEvent.input(claimTextarea, {
      target: { value: 'Keep organization dispute claim draft.' },
    })
    await fireEvent.input(evidenceTextarea, {
      target: { value: 'Keep organization dispute evidence draft.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /^Gửi báo cáo$/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('Organization dispute report was refused.')
    expect(claimTextarea).toHaveValue('Keep organization dispute claim draft.')
    expect(evidenceTextarea).toHaveValue('Keep organization dispute evidence draft.')
  })
})
