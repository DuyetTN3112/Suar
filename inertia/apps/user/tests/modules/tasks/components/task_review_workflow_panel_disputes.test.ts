import { fireEvent, render, screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type InertiaPostOptions = {
  onError?: (errors: Record<string, string | string[] | undefined>) => void
  onSuccess?: () => void
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

vi.mock('@/apps/user/modules/tasks/components/detail/task_discussion_tab.svelte', async () => {
  const stubModule = await import('../../../shared/test_stubs/task_discussion_stub.svelte')
  return { default: stubModule.default }
})

import {
  createMockTaskReviewDetail,
  createDefaultObservationContext,
} from '@/apps/shared/tests/tasks/support/task_review_workflow_test_support'
import TaskReviewWorkflowPanel from '@/apps/user/modules/tasks/components/detail/task_review_workflow_panel.svelte'

describe('TaskReviewWorkflowPanel - Disputes & Decisions Flow', () => {
  beforeEach(() => {
    inertiaMocks.router.post.mockClear()
    inertiaMocks.router.post.mockReset()
  })

  it('shows the reviewer confirmation action after the reviewee agrees', () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/tasks/task-1',
        detail: createMockTaskReviewDetail({
          workflow: { id: 'workflow-1', status: 'awaiting_response', completed_review_count: 2, required_review_count: 2 },
          reviewers: [
            { reviewer_id: 'reviewer-1', reviewer_name: 'Reviewer 1', reviewer_role: 'task_giver_required', status: 'submitted', priority_rank: 1 },
          ],
          reviewMessages: [
            {
              id: 'review-1',
              author_id: 'reviewer-1',
              author_name: 'Reviewer 1',
              message_type: 'review',
              body: 'Completed well.',
              created_at: '2026-08-01T00:00:00.000Z',
              reviewee_decision: 'accepted',
              requires_reviewer_confirmation: true,
              reviewer_agreed_at: null,
            },
            {
              id: 'response-1',
              author_id: 'worker-1',
              author_name: 'Worker',
              message_type: 'reviewee_response',
              parent_review_message_id: 'review-1',
              body: 'I agree.',
              created_at: '2026-08-01T00:05:00.000Z',
            },
          ],
        }),
      },
    })

    expect(screen.getByRole('button', { name: 'Đồng ý sau trao đổi' })).toBeInTheDocument()
  })

  it('lets the reviewee accept or respond from task detail', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'worker-1',
        taskDetailUrl: '/tasks/task-1',
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
        redirect_to: '/tasks/task-1',
      },
      expect.objectContaining({ preserveScroll: true, preserveState: true })
    )
  })

  it('lets the reviewer open the dispute discussion after the reviewee responds', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/tasks/task-1',
        detail: createMockTaskReviewDetail({
          workflow: { id: 'workflow-1', status: 'awaiting_response', completed_review_count: 2, required_review_count: 2 },
          reviewers: [
            { reviewer_id: 'reviewer-1', reviewer_name: 'Reviewer', reviewer_role: 'peer', status: 'submitted', priority_rank: 1 },
          ],
          reviewMessages: [
            { id: 'review-1', author_id: 'reviewer-1', author_name: 'Reviewer', message_type: 'review', body: 'Please clarify.', created_at: '2026-08-01T00:00:00.000Z' },
            { id: 'response-1', author_id: 'worker-1', author_name: 'Worker', message_type: 'reviewee_response', parent_review_message_id: 'review-1', body: 'I disagree with the review.', created_at: '2026-08-01T00:05:00.000Z' },
          ],
        }),
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Mở tranh luận' }))

    expect(inertiaMocks.router.post).toHaveBeenCalledWith(
      '/task-reviews/workflow-1/open-dispute',
      {
        review_message_id: 'review-1',
        response_message_id: 'response-1',
        project_id: 'project-1',
        task_id: 'task-1',
        redirect_to: '/tasks/task-1',
      },
      expect.objectContaining({ preserveScroll: true, preserveState: true })
    )
  })

  it('labels an already-open dispute as continuing discussion instead of opening it again', () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/tasks/task-1',
        detail: createMockTaskReviewDetail({
          workflow: { id: 'workflow-1', status: 'disputed', completed_review_count: 2, required_review_count: 2 },
          reviewers: [
            { reviewer_id: 'reviewer-1', reviewer_name: 'Reviewer', reviewer_role: 'peer', status: 'submitted', priority_rank: 1 },
          ],
          reviewMessages: [
            { id: 'review-1', author_id: 'reviewer-1', author_name: 'Reviewer', message_type: 'review', body: 'Please clarify.', created_at: '2026-08-01T00:00:00.000Z' },
            { id: 'response-1', author_id: 'worker-1', author_name: 'Worker', message_type: 'reviewee_response', parent_review_message_id: 'review-1', body: 'I disagree with the review.', created_at: '2026-08-01T00:05:00.000Z' },
          ],
        }),
      },
    })

    expect(screen.queryByRole('button', { name: 'Mở tranh luận' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tiếp tục tranh luận' })).toBeInTheDocument()
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
    const textarea = screen.getByLabelText('Phản hồi/tranh luận')
    await fireEvent.input(textarea, { target: { value: 'Keep this response draft.' } })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi phản hồi/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The review workflow changed. Refresh and try again.'
    )
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
    await fireEvent.input(claimTextarea, { target: { value: 'Keep this dispute claim draft.' } })
    await fireEvent.input(evidenceTextarea, { target: { value: 'Keep this dispute evidence draft.' } })
    await fireEvent.click(screen.getByRole('button', { name: /^Gửi báo cáo$/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('A dispute report is already open.')
    expect(claimTextarea).toHaveValue('Keep this dispute claim draft.')
    expect(evidenceTextarea).toHaveValue('Keep this dispute evidence draft.')
  })

  it('exposes the provenance-bound observation flow in the user shell', () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/tasks/task-1',
        detail: createMockTaskReviewDetail({
          workflow: { id: '11111111-1111-4111-8111-111111111111', status: 'awaiting_review' },
          reviewAuthoringContext: createDefaultObservationContext(),
        }),
      },
    })
    expect(screen.getByTestId('review-observation-authoring')).toBeInTheDocument()
    expect(screen.getByText(/Server-pinned snapshot/)).toBeInTheDocument()
  })
})
