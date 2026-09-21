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

import { createMockTaskReviewDetail } from '@/apps/shared/tests/tasks/support/task_review_workflow_test_support'
import TaskReviewWorkflowPanel from '@/apps/user/modules/tasks/components/detail/task_review_workflow_panel.svelte'

describe('TaskReviewWorkflowPanel - Reviews Flow', () => {
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
        detail: createMockTaskReviewDetail({
          task: { assigned_to: 'worker-1', creator_id: 'creator-1' },
          workflow: null,
          reviewers: [],
        }),
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
      expect.objectContaining({ preserveScroll: true, preserveState: true })
    )
  })

  it('lets an eligible reviewer submit from task detail and stay on task detail', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/tasks/task-1',
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
        redirect_to: '/tasks/task-1',
      },
      expect.objectContaining({ preserveScroll: true, preserveState: true })
    )
  })

  it('lets the next pending reviewer submit while the workflow is in review', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-2',
        taskDetailUrl: '/tasks/task-1',
        detail: createMockTaskReviewDetail({
          workflow: { id: 'workflow-1', status: 'in_review', completed_review_count: 1, required_review_count: 2 },
          reviewers: [
            { reviewer_id: 'reviewer-1', reviewer_name: 'Reviewer 1', reviewer_role: 'peer', status: 'submitted', priority_rank: 1 },
            { reviewer_id: 'reviewer-2', reviewer_name: 'Reviewer 2', reviewer_role: 'peer', status: 'pending', priority_rank: 2 },
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
        redirect_to: '/tasks/task-1',
      },
      expect.objectContaining({ preserveScroll: true, preserveState: true })
    )
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
        detail: createMockTaskReviewDetail({
          workflow: { id: 'workflow-1', status: 'in_review', completed_review_count: 1, required_review_count: 2 },
          reviewers: [
            { reviewer_id: 'reviewer-1', reviewer_name: 'Reviewer 1', reviewer_role: 'peer', status: 'submitted', priority_rank: 1 },
            { reviewer_id: 'reviewer-2', reviewer_name: 'Reviewer 2', reviewer_role: 'peer', status: 'pending', priority_rank: 2 },
          ],
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
                { id: 'revision-1', revision_number: 1, body: 'Initial review.', editor_id: 'reviewer-1', editor_name: 'Reviewer 1', created_at: '2026-08-10T10:00:00.000Z' },
                { id: 'revision-2', revision_number: 2, body: 'Corrected review.', editor_id: 'reviewer-1', editor_name: 'Reviewer 1', created_at: '2026-08-10T11:30:00.000Z' },
              ],
            },
          ],
        }),
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
        detail: createMockTaskReviewDetail(),
      },
    })

    expect(screen.getByLabelText('Nhập review')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gửi review/i })).toBeInTheDocument()
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
        detail: createMockTaskReviewDetail(),
      },
    })

    const textarea = screen.getByLabelText('Nhập review')
    await fireEvent.input(textarea, { target: { value: 'Keep this review draft.' } })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi review/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('Reviewer already submitted this task.')
    expect(textarea).toHaveValue('Keep this review draft.')
  })
})
