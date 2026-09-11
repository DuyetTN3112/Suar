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

import TaskReviewWorkflowPanel from '@/apps/user/modules/tasks/components/detail/task_review_workflow_panel.svelte'

describe('TaskReviewWorkflowPanel', () => {
  beforeEach(() => {
    inertiaMocks.router.post.mockClear()
    inertiaMocks.router.post.mockReset()
  })

  it('separates task context from the review workflow with dedicated tabs', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/tasks/task-1',
        initialTab: 'context',
        detail: {
          task: {
            id: 'task-1',
            title: 'Chuẩn hóa checklist bàn giao capstone',
            description: 'Kiểm tra toàn bộ checklist trước khi bàn giao.',
            status: 'done',
            priority: 'high',
            label: 'enhancement',
            difficulty: 'medium',
            due_date: '2026-08-01T00:00:00.000Z',
            estimated_time: 8,
            task_visibility: 'internal',
            created_at: '2026-07-20T00:00:00.000Z',
            updated_at: '2026-08-03T00:00:00.000Z',
            assigned_to: 'worker-1',
            assignee_name: 'Trần Minh Quân',
            creator_name: 'Trần Ngọc Duyệt',
          },
          assignment: {
            id: 'assignment-1',
            assignment_status: 'completed',
            estimated_hours: 8,
            actual_hours: 10,
            completed_at: '2026-08-03T00:00:00.000Z',
          },
          workflow: null,
          reviewers: [],
          comments: [],
          reviewMessages: [],
        },
      },
    })

    expect(
      screen.getByRole('heading', { name: 'Chuẩn hóa checklist bàn giao capstone' })
    ).toBeInTheDocument()
    expect(screen.getByText('Kiểm tra toàn bộ checklist trước khi bàn giao.')).toBeInTheDocument()
    expect(screen.getAllByText('done').length).toBeGreaterThan(0)
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getAllByText('Trần Minh Quân').length).toBeGreaterThan(0)
    const taskContext = screen.getByTestId('task-detail-read-surface')
    const metadataSidebar = taskContext.querySelector('aside')

    expect(screen.getByRole('tab', { name: 'Nội dung Task' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Tệp/i })).toBeInTheDocument()
    expect(screen.queryByTestId('task-discussion-stub')).not.toBeInTheDocument()
    await fireEvent.click(screen.getByRole('tab', { name: /Thảo luận/i }))
    expect(screen.getByTestId('task-detail-discussion')).toContainElement(
      screen.getByTestId('task-discussion-stub')
    )
    expect(metadataSidebar).toBeTruthy()
    expect(metadataSidebar).toHaveTextContent('enhancement')
    expect(metadataSidebar).toHaveTextContent('8h')

    await fireEvent.click(screen.getByRole('tab', { name: 'Đánh giá & tranh chấp' }))
    expect(screen.getByRole('heading', { name: 'Đánh giá nhiệm vụ này' })).toBeInTheDocument()
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

  it('shows the reviewer confirmation action after the reviewee agrees', () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/tasks/task-1',
        detail: {
          task: { assigned_to: 'worker-1' },
          workflow: {
            id: 'workflow-1',
            status: 'awaiting_response',
            completed_review_count: 2,
            required_review_count: 2,
          },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer 1',
              reviewer_role: 'task_giver_required',
              status: 'submitted',
              priority_rank: 1,
            },
          ],
          comments: [],
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
        },
      },
    })

    expect(screen.getByRole('button', { name: 'Đồng ý sau trao đổi' })).toBeInTheDocument()
  })

  it('lets the reviewer edit their submitted review while the workflow is active', async () => {
    inertiaMocks.router.post.mockImplementation((_url, _data, options) => {
      options?.onSuccess?.()
    })
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/tasks/task-1',
        detail: {
          task: { assigned_to: 'worker-1' },
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
          reviewMessages: [
            {
              id: 'message-1',
              body: 'Corrected review.',
              created_at: '2026-08-10T10:00:00.000Z',
              updated_at: '2026-08-10T11:30:00.000Z',
              author_id: 'reviewer-1',
              author_name: 'Reviewer 1',
              message_type: 'review',
              revision_count: 2,
              revisions: [
                {
                  id: 'revision-1',
                  revision_number: 1,
                  body: 'Initial review.',
                  editor_id: 'reviewer-1',
                  editor_name: 'Reviewer 1',
                  created_at: '2026-08-10T10:00:00.000Z',
                },
                {
                  id: 'revision-2',
                  revision_number: 2,
                  body: 'Corrected review.',
                  editor_id: 'reviewer-1',
                  editor_name: 'Reviewer 1',
                  created_at: '2026-08-10T11:30:00.000Z',
                },
              ],
            },
          ],
        },
      },
    })

    expect(screen.getByText(/Đã chỉnh sửa|Edited/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nhập review')).not.toBeInTheDocument()
    await fireEvent.click(screen.getByText(/Xem lịch sử chỉnh sửa|View edit history/i))
    expect(screen.getByText('Initial review.')).toBeInTheDocument()
    expect(screen.getByText(/Phiên bản 1|Version 1/i)).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /Sửa review|Edit review/i }))
    const textarea = screen.getByLabelText('Sửa review')
    expect(textarea).toHaveValue('Corrected review.')

    await fireEvent.input(textarea, { target: { value: 'Corrected review.' } })
    await fireEvent.click(screen.getByRole('button', { name: /Cập nhật review|Update review/i }))
    expect(screen.queryByLabelText('Sửa review')).not.toBeInTheDocument()

    expect(inertiaMocks.router.post).toHaveBeenCalledWith(
      '/task-reviews/tasks/task-1/reviews',
      {
        body: 'Corrected review.',
        project_id: 'project-1',
        redirect_to: '/tasks/task-1',
      },
      expect.objectContaining({ preserveScroll: true, preserveState: true })
    )
  })

  it('allows another project member to volunteer a peer review', () => {
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

    expect(screen.getByLabelText('Nhập review')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gửi review/i })).toBeInTheDocument()
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
          reviewMessages: [
            { id: 'review-1', author_id: 'reviewer-1', author_name: 'Reviewer', message_type: 'review', body: 'Please clarify.', created_at: '2026-08-01T00:00:00.000Z' },
          ],
        },
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
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )
  })

  it('lets the reviewer open the dispute discussion after the reviewee responds', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/tasks/task-1',
        detail: {
          task: { assigned_to: 'worker-1' },
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
          reviewMessages: [
            {
              id: 'review-1',
              author_id: 'reviewer-1',
              author_name: 'Reviewer',
              message_type: 'review',
              body: 'Please clarify.',
              created_at: '2026-08-01T00:00:00.000Z',
            },
            {
              id: 'response-1',
              author_id: 'worker-1',
              author_name: 'Worker',
              message_type: 'reviewee_response',
              parent_review_message_id: 'review-1',
              body: 'I disagree with the review.',
              created_at: '2026-08-01T00:05:00.000Z',
            },
          ],
        },
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
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )
  })

  it('labels an already-open dispute as continuing discussion instead of opening it again', () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/tasks/task-1',
        detail: {
          task: { assigned_to: 'worker-1' },
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
          reviewMessages: [
            {
              id: 'review-1',
              author_id: 'reviewer-1',
              author_name: 'Reviewer',
              message_type: 'review',
              body: 'Please clarify.',
              created_at: '2026-08-01T00:00:00.000Z',
            },
            {
              id: 'response-1',
              author_id: 'worker-1',
              author_name: 'Worker',
              message_type: 'reviewee_response',
              parent_review_message_id: 'review-1',
              body: 'I disagree with the review.',
              created_at: '2026-08-01T00:05:00.000Z',
            },
          ],
        },
      },
    })

    expect(screen.queryByRole('button', { name: 'Mở tranh luận' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tiếp tục tranh luận' })).toBeInTheDocument()
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
          reviewMessages: [
            { id: 'review-1', author_id: 'reviewer-1', author_name: 'Reviewer', message_type: 'review', body: 'Please clarify.', created_at: '2026-08-01T00:00:00.000Z' },
          ],
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Phản hồi đánh giá/i }))
    const textarea = screen.getByLabelText('Phản hồi/tranh luận')
    await fireEvent.input(textarea, {
      target: { value: 'Keep this response draft.' },
    })
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
          reviewMessages: [
            { id: 'review-1', author_id: 'reviewer-1', author_name: 'Reviewer', message_type: 'review', body: 'Please clarify.', created_at: '2026-08-01T00:00:00.000Z' },
            { id: 'response-1', parent_review_message_id: 'review-1', author_id: 'worker-1', author_name: 'Worker', message_type: 'reviewee_response', body: 'Here is the clarification.', created_at: '2026-08-01T01:00:00.000Z' },
          ],
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Gửi báo cáo tranh chấp/i }))
    const claimTextarea = screen.getByRole('textbox', { name: 'Dispute claim' })
    const evidenceTextarea = screen.getByRole('textbox', { name: 'Dispute evidence' })
    await fireEvent.input(claimTextarea, {
      target: { value: 'Keep this dispute claim draft.' },
    })
    await fireEvent.input(evidenceTextarea, {
      target: { value: 'Keep this dispute evidence draft.' },
    })
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
        detail: {
          task: { assigned_to: 'worker-1' },
          workflow: { id: '11111111-1111-4111-8111-111111111111', status: 'awaiting_review' },
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
          reviewAuthoringContext: {
            reviewSessionId: '22222222-2222-4222-8222-222222222222',
            taskAssignmentId: '33333333-3333-4333-8333-333333333333',
            assignmentSnapshotId: '44444444-4444-4444-8444-444444444444',
            assignmentSnapshotHash: `sha256:${'a'.repeat(64)}`,
            completionReportId: '55555555-5555-4555-8555-555555555555',
            completionReportHash: `sha256:${'b'.repeat(64)}`,
            taskContractVersionId: '66666666-6666-4666-8666-666666666666',
            taskContractHash: `sha256:${'c'.repeat(64)}`,
            subjectUserId: 'worker-1',
            claims: [
              {
                id: '77777777-7777-4777-8777-777777777777',
                proposed_title: 'Claim',
                proposed_statement: 'Statement',
                action: 'deliver',
                object: 'change',
                actual_ownership: 'contributor',
                claim_status: 'candidate',
                deliverable_refs: [],
                criterion_result_refs: [],
              },
            ],
            evidence: [
              {
                id: '88888888-8888-4888-8888-888888888888',
                reviewer_access_state: 'available',
                access_classification: 'internal',
              },
            ],
            reviewerTypes: [{ reviewer_id: 'reviewer-1', reviewer_type: 'human' }],
          },
        },
      },
    })
    expect(screen.getByTestId('review-observation-authoring')).toBeInTheDocument()
    expect(screen.getByText(/Server-pinned snapshot/)).toBeInTheDocument()
  })
})
