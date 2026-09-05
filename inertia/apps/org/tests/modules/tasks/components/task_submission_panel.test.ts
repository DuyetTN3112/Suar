import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import axios from 'axios'
import { describe, expect, it, vi } from 'vitest'

vi.mock('axios')

import TaskSubmissionPanel from '@/apps/org/modules/tasks/components/detail/task_submission_panel.svelte'

const mockedAxios = vi.mocked(axios)

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

    expect(screen.getByText(/Chưa có báo cáo (hoàn thành|governance tuỳ chọn) nào/i)).toBeInTheDocument()
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

    expect(screen.getByText(/Báo cáo hoàn thành công việc|Báo cáo hoàn thành \(tuỳ chọn\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Tóm tắt kết quả/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lưu nháp/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nộp báo cáo/i })).toBeInTheDocument()
  })

  it('renders the report readiness summary from existing task contract fields', () => {
    render(TaskSubmissionPanel, {
      props: {
        taskId: 'task-123',
        isAssignee: true,
        task: {
          verification_method: 'automated_test',
          acceptance_criteria: 'Tests pass\nResult is documented',
        },
        initialLoading: false,
        initialSubmission: null,
      },
    })

    expect(
      screen.getAllByRole('region', {
        name: /Báo cáo sẵn sàng|Mức độ sẵn sàng hoàn thành|Completion readiness/i,
      }).length
    ).toBeGreaterThan(0)
    expect(screen.getByText('Tests pass')).toBeInTheDocument()
    expect(screen.getByText('Result is documented')).toBeInTheDocument()
    expect(
      screen.getByText(
        /Phương thức xác minh này cần ít nhất một bằng chứng|yêu cầu ít nhất một bằng chứng|Submit blocked|Không thể nộp/i
      )
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lưu nháp/i })).not.toBeDisabled()
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

  it('uses the assignment-scoped native Completion Report flow for a pinned brief', async () => {
    mockedAxios.get.mockResolvedValue({ data: { data: null } })
    mockedAxios.post.mockResolvedValue({
      data: {
        data: {
          taskSubmissionId: 'submission-1',
          taskId: 'task-123',
          taskAssignmentId: 'assignment-1',
          assigneeId: 'user-1',
          assignmentSnapshotId: 'snapshot-1',
          assignmentSnapshotHash:
            'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          taskContractVersionId: 'contract-1',
          status: 'draft',
          replayed: false,
        },
      },
    })

    render(TaskSubmissionPanel, {
      props: {
        taskId: 'task-123',
        isAssignee: true,
        task: {
          verification_method: 'code_review',
          acceptance_criteria: 'Code must compile',
          assigneeId: 'user-1',
          resolved_brief: {
            state: 'published',
            audience: 'work_participant',
            resolutionSource: 'assignment_snapshot',
            assignmentId: 'assignment-1',
            assignmentSnapshotId: 'snapshot-1',
            assignmentSnapshotHash:
              'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            contractVersionId: 'contract-1',
            resolvedContract: {
              work: {
                deliverables: [{ id: 'deliverable-1', title: 'API implementation' }],
                acceptanceCriteria: [{ id: 'criterion-1', statement: 'The API compiles.' }],
              },
              evidence: {
                requirements: [{ id: 'requirement-1', title: 'Test report', required: true }],
              },
            },
          },
        },
        initialLoading: false,
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Add optional report|Thêm báo cáo tuỳ chọn/i }))

    await waitFor(() => {
      expect(mockedAxios.get.mock.calls).toContainEqual([
        '/api/v1/task-assignments/assignment-1/completion-report',
      ])
      expect(
        screen.getByText(/Structured completion report|Báo cáo hoàn thành có cấu trúc/i)
      ).toBeInTheDocument()
      expect(screen.getByLabelText(/Work performed|Công việc đã thực hiện/i)).toBeInTheDocument()
    })
    expect(mockedAxios.post.mock.calls).toContainEqual([
      '/api/v1/task-assignments/assignment-1/completion-report/start',
    ])
  })

  it('fails closed when an assignment brief is restricted or incomplete', async () => {
    mockedAxios.get.mockClear()
    mockedAxios.post.mockClear()

    render(TaskSubmissionPanel, {
      props: {
        taskId: 'task-123',
        isAssignee: true,
        task: {
          verification_method: 'code_review',
          acceptance_criteria: 'Code must compile',
          assigneeId: 'user-1',
          resolved_brief: {
            state: 'restricted',
            audience: 'work_participant',
            resolutionSource: 'restricted',
            assignmentId: 'assignment-1',
            restrictionCode: 'TASK_BRIEF_ASSIGNMENT_ACCESS_STALE',
          },
        },
        initialLoading: false,
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Add optional report|Thêm báo cáo tuỳ chọn/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /brief is unavailable or incomplete|Brief của assignment không có hoặc chưa đầy đủ/i
    )
    expect(
      screen.queryByLabelText(/Work performed|Công việc đã thực hiện/i)
    ).not.toBeInTheDocument()
    expect(mockedAxios.get.mock.calls).toHaveLength(0)
    expect(mockedAxios.post.mock.calls).toHaveLength(0)
  })
})
