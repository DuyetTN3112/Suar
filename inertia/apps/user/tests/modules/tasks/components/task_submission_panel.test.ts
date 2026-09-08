import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('axios')

import TaskSubmissionPanel from '@/apps/user/modules/tasks/components/detail/task_submission_panel.svelte'

const mockedAxios = vi.mocked(axios)

describe('TaskSubmissionPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedAxios.get.mockResolvedValue({
      data: {
        data: null,
      },
    })
  })

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
    expect(
      screen.getAllByRole('region', { name: /Completion readiness|Mức độ sẵn sàng hoàn thành/i })
        .length
    ).toBeGreaterThan(0)
    expect(
      screen.getByText(/Draft can be saved partially|Có thể lưu nháp một phần/i)
    ).toBeInTheDocument()
  })

  it('explains the submit blocker when the selected verification method needs evidence', async () => {
    render(TaskSubmissionPanel, {
      props: {
        taskId: 'task-123',
        isAssignee: true,
        task: {
          verification_method: 'automated_test',
          acceptance_criteria: 'Automated tests pass',
        },
        initialLoading: false,
        initialSubmission: null,
      },
    })

    await fireEvent.input(screen.getByLabelText(/Tóm tắt kết quả/i), {
      target: { value: 'Tests pass and the result is ready.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Nộp báo cáo/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/Submit blocked|Không thể nộp/i)
    expect(
      screen.getByText(
        /automated test requires at least one verification evidence|yêu cầu ít nhất một bằng chứng/i
      )
    ).toBeInTheDocument()
    expect(mockedAxios.post.mock.calls).toHaveLength(0)
  })

  it('loads canonical submission evidence from the task-submissions endpoint', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          data: {
            id: 'sub-456',
            status: 'submitted',
            summary: 'Completed successfully',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [],
        },
      })

    render(TaskSubmissionPanel, {
      props: {
        taskId: 'task-123',
        isAssignee: true,
        task: {
          verification_method: 'code_review',
          acceptance_criteria: 'Code must compile',
        },
      },
    })

    await waitFor(() => {
      expect(mockedAxios.get.mock.calls).toContainEqual([
        '/api/v1/task-submissions/sub-456/evidences',
      ])
    })
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
                action: 'implement',
                object: 'API',
                roleInTask: 'API designer',
                ownershipLevel: 'primary_owner',
                autonomyLevel: 'independent',
                deliverables: [{ id: 'deliverable-1', title: 'API implementation' }],
                acceptanceCriteria: [{ id: 'criterion-1', statement: 'The API compiles.' }],
              },
              evidence: {
                requirements: [
                  {
                    id: 'requirement-1',
                    title: 'Test report',
                    required: true,
                  },
                ],
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
      expect(screen.getAllByText(/The API compiles\./i).length).toBeGreaterThan(0)
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

  it('saves an explicit native draft without inventing deliverables, criteria, or claims', async () => {
    mockedAxios.get.mockResolvedValue({ data: { data: null } })
    mockedAxios.post
      .mockResolvedValueOnce({
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
      .mockResolvedValueOnce({
        data: {
          data: {
            id: 'report-1',
            taskSubmissionId: 'submission-1',
            taskId: 'task-123',
            taskAssignmentId: 'assignment-1',
            assignmentSnapshotId: 'snapshot-1',
            assignmentSnapshotHash:
              'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            taskContractVersionId: 'contract-1',
            reportedBy: 'user-1',
            revision: 1,
            status: 'draft',
            report: {
              workPerformed: 'Started the implementation.',
              contributionStatement: '',
              actualRole: 'API designer',
              actualOwnership: 'primary_owner',
              actualAutonomy: null,
              actualOutcomes: {},
              impactObserved: {},
              limitations: null,
              remainingWork: null,
              actualDeliverableIds: [],
              criterionResults: [],
              evidence: [],
              contributorClaims: [],
            },
            evidenceManifest: [],
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
                action: 'implement',
                object: 'API',
                deliverables: [{ id: 'deliverable-1', title: 'API implementation' }],
                acceptanceCriteria: [{ id: 'criterion-1', statement: 'The API compiles.' }],
              },
              evidence: { requirements: [] },
            },
          },
        },
        initialLoading: false,
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Add optional report|Thêm báo cáo tuỳ chọn/i }))

    await waitFor(() =>
      expect(screen.getByLabelText(/Work performed|Công việc đã thực hiện/i)).toBeInTheDocument()
    )
    await fireEvent.input(screen.getByLabelText(/Work performed|Công việc đã thực hiện/i), {
      target: { value: 'Started the implementation.' },
    })
    await fireEvent.input(screen.getByLabelText(/Actual role|Vai trò thực tế/i), {
      target: { value: 'API designer' },
    })
    await fireEvent.change(screen.getByLabelText(/Actual ownership|Mức sở hữu thực tế/i), {
      target: { value: 'primary_owner' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Save draft|Lưu nháp/i }))

    const draftCall = mockedAxios.post.mock.calls.find(
      ([url]) => url === '/api/v1/task-assignments/assignment-1/completion-report'
    )
    expect(draftCall).toBeDefined()
    const draftPayload = draftCall?.[1] as { report?: Record<string, unknown> } | undefined
    expect(draftPayload?.report).toEqual(
      expect.objectContaining({
        actualRole: 'API designer',
        actualOwnership: 'primary_owner',
        actualDeliverableIds: [],
        criterionResults: [],
        contributorClaims: [],
      })
    )
  })
})
