import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import TaskSubmissionPanel from '@/apps/org/modules/tasks/components/detail/task_submission_panel.svelte'

describe('TaskSubmissionPanel', () => {
  it('renders loading state correctly', () => {
    render(TaskSubmissionPanel, {
      props: {
        taskId: 'task-123',
        isAssignee: true,
        task: {
          verification_method: 'code_review',
          acceptance_criteria: 'Code must compile',
        },
        // We can simulate loading state in props or mock implementation
        initialLoading: true,
      },
    })

    expect(screen.getByText(/Đang tải thông tin nộp bài.../i)).toBeInTheDocument()
  })

  it('renders empty/no submission state for non-assignee', () => {
    render(TaskSubmissionPanel, {
      props: {
        taskId: 'task-123',
        isAssignee: false,
        task: {
          verification_method: 'code_review',
          acceptance_criteria: 'Code must compile',
        },
        initialLoading: false,
        initialSubmission: null,
      },
    })

    expect(screen.getByText(/Chưa có báo cáo hoàn thành nào/i)).toBeInTheDocument()
  })

  it('renders editable form for assignee when no submission exists', () => {
    render(TaskSubmissionPanel, {
      props: {
        taskId: 'task-123',
        isAssignee: true,
        task: {
          verification_method: 'code_review',
          acceptance_criteria: 'Code must compile',
        },
        initialLoading: false,
        initialSubmission: null,
      },
    })

    expect(screen.getByText(/Báo cáo hoàn thành công việc/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Tóm tắt kết quả/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lưu nháp/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nộp báo cáo/i })).toBeInTheDocument()
  })

  it('renders locked read-only state correctly', () => {
    render(TaskSubmissionPanel, {
      props: {
        taskId: 'task-123',
        isAssignee: true,
        task: {
          verification_method: 'code_review',
          acceptance_criteria: 'Code must compile',
        },
        initialLoading: false,
        initialSubmission: {
          id: 'sub-456',
          status: 'locked',
          summary: 'Completed successfully',
          implementationNotes: 'Notes here',
          lockedAt: '2026-06-24T12:00:00Z',
        },
        initialEvidences: [
          {
            id: 'ev-1',
            evidenceType: 'pull_request',
            url: 'https://github.com/pr/1',
            title: 'PR #1',
          },
        ],
      },
    })

    expect(screen.getAllByText(/Báo cáo đã khóa/i).length).toBeGreaterThan(0)
    expect(screen.getByText('Completed successfully')).toBeInTheDocument()
    expect(screen.getByText('PR #1')).toBeInTheDocument()
    // Inputs should not be visible or should be disabled
    expect(screen.queryByLabelText(/Tóm tắt kết quả/i)).not.toBeInTheDocument()
  })

  it('displays validation error messages from API', () => {
    render(TaskSubmissionPanel, {
      props: {
        taskId: 'task-123',
        isAssignee: true,
        task: {
          verification_method: 'code_review',
          acceptance_criteria: 'Code must compile',
        },
        initialLoading: false,
        initialSubmission: null,
        initialError: 'Tóm tắt kết quả là bắt buộc',
      },
    })

    expect(screen.getByText('Tóm tắt kết quả là bắt buộc')).toBeInTheDocument()
  })
})
