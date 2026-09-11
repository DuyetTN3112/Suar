import { render, screen, waitFor } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import TaskExecutionBrief from '@/apps/user/modules/tasks/components/detail/task_execution_brief.svelte'

describe('TaskExecutionBrief', () => {
  it('renders rich execution context for task handoff', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {
          expected_deliverables: ['Curriculum proposal document', 'Competency rubrics guide'],
        },
      },
    })

    expect(screen.getByText('Curriculum proposal document')).toBeInTheDocument()
    expect(screen.getByText('Competency rubrics guide')).toBeInTheDocument()
    expect(screen.queryByText('Curriculum coverage: 95%')).not.toBeInTheDocument()
    expect(screen.queryByText('Mức độ ảnh hưởng')).not.toBeInTheDocument()
  })

  it('renders the authored work contract as the primary execution information', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {},
        resolvedBrief: {
          schemaVersion: 'task-resolved-brief.v1',
          state: 'published',
          audience: 'work_participant',
          resolutionSource: 'assignment_snapshot',
          resolvedContract: {
            title: 'API contract',
            specification: { plainText: 'Build the pre-order API.' },
            work: {
              action: 'Design and implement',
              object: 'Pre-order lifecycle endpoints',
              problemStatement: 'The product needs a governed lifecycle.',
              desiredOutcome: 'A reviewable API implementation.',
              scope: [{ id: 'scope-1', title: 'Create and cancel endpoints', description: 'Include integration tests.' }],
              outOfScope: [{ id: 'out-1', title: 'Payment provider replacement' }],
              deliverables: [{ id: 'del-1', title: 'Versioned API contract' }],
              acceptanceCriteria: [{ id: 'crit-1', statement: 'Integration checks pass.' }],
              qualityRequirements: [{ id: 'quality-1', title: 'Idempotency' }],
              constraints: [{ id: 'constraint-1', title: 'Keep existing integrations' }],
              dependencies: [{ id: 'dep-1', title: 'Inventory API', state: 'available' }],
              roleInTask: 'Backend engineer',
              ownershipLevel: 'primary_owner',
            },
          },
        },
      },
    })

    expect(screen.getByTestId('task-contract-work')).toBeInTheDocument()
    expect(screen.getByText('Create and cancel endpoints — Include integration tests.')).toBeInTheDocument()
    expect(screen.getByText('Payment provider replacement')).toBeInTheDocument()
    expect(screen.getByText('Versioned API contract')).toBeInTheDocument()
    expect(screen.getByText('Integration checks pass.')).toBeInTheDocument()
    expect(screen.getByText('Tester dùng các điều kiện này để kiểm tra kết quả sau khi người làm chuyển task.')).toBeInTheDocument()
  })

  it('renders the structured Task contract instead of repeating its plain-text projection', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {},
        resolvedBrief: {
          schemaVersion: 'task-resolved-brief.v1',
          state: 'published',
          audience: 'work_participant',
          resolutionSource: 'assignment_snapshot',
          resolvedContract: {
            title: 'Chuẩn hóa lịch sử Task',
            specification: {
              plainText: 'Bản sao chữ của contract không được lặp lại.',
              richContent: {
                schemaVersion: 'suar.task_brief.v2',
                workItems: [{ id: 'work-1', affectedArea: 'Chi tiết Task', requiredChange: 'Chuẩn hóa lịch sử', resultingBehaviour: 'Đúng quyền xem' }],
                currentState: 'Lịch sử đang hiển thị không thống nhất.',
                currentStateSituation: 'Khi mở chi tiết Task.',
                affectedParties: 'Người giao và người thực hiện.',
                impactIfUnresolved: 'Có thể lộ thông tin không đúng quyền.',
                scope: [{ id: 'scope-1', text: 'Luồng lịch sử Task' }],
                outOfScope: [], businessRules: [], constraints: [], dependencies: [],
                deliverables: [{ id: 'deliverable-1', outputType: 'Giao diện', locationOrRecipient: 'Chi tiết Task', minimumState: 'Hiển thị đúng quyền' }],
                qualityRequirements: [],
                acceptanceCriteria: [{ id: 'acceptance-1', condition: 'Người xem không có quyền', action: 'Mở chi tiết Task', observableResult: 'Không thấy lịch sử bị hạn chế' }],
                desiredValue: null,
              },
            },
            work: {},
          },
        },
      },
    })

    expect(screen.getByTestId('task-structured-brief')).toBeInTheDocument()
    expect(screen.getByText('Chuẩn hóa lịch sử')).toBeInTheDocument()
    expect(screen.getByText('Không thấy lịch sử bị hạn chế')).toBeInTheDocument()
    expect(screen.queryByText('Bản sao chữ của contract không được lặp lại.')).not.toBeInTheDocument()
  })

  it('keeps content and acceptance sections isolated for detail tabs', async () => {
    const resolvedBrief = {
      schemaVersion: 'task-resolved-brief.v1' as const,
      state: 'published' as const,
      audience: 'work_participant',
      resolutionSource: 'assignment_snapshot',
      resolvedContract: {
        title: 'Scoped contract',
        specification: {
          richContent: {
            schemaVersion: 'suar.task_brief.v2' as const,
            workItems: [{ id: 'work-1', affectedArea: 'API', requiredChange: 'Sửa quyền', resultingBehaviour: 'Từ chối đúng' }],
            currentState: 'Đang lỗi', currentStateSituation: 'Khi gọi API', affectedParties: 'Người dùng', impactIfUnresolved: 'Lộ dữ liệu',
            scope: [], outOfScope: [], businessRules: [], constraints: [], dependencies: [],
            deliverables: [{ id: 'deliverable-1', outputType: 'Patch', locationOrRecipient: 'Repository', minimumState: 'Merged' }],
            qualityRequirements: [{ id: 'quality-1', property: 'An toàn', appliesTo: 'API', observableCheck: 'Test pass' }],
            acceptanceCriteria: [{ id: 'acceptance-1', condition: 'Không có quyền', action: 'Gọi API', observableResult: '403' }],
            desiredValue: { beneficiary: 'Người dùng', usefulState: 'Dữ liệu được bảo vệ' },
          },
        },
      },
    }

    const view = render(TaskExecutionBrief, { props: { task: {}, resolvedBrief, section: 'content' } })
    expect(screen.getByText('Sửa quyền')).toBeInTheDocument()
    expect(screen.queryByText('Tiêu chí nghiệm thu')).not.toBeInTheDocument()
    expect(screen.queryByText('Patch')).not.toBeInTheDocument()

    await view.rerender({ task: {}, resolvedBrief, section: 'acceptance' })
    expect(screen.getByText('Patch')).toBeInTheDocument()
    expect(screen.getByText('An toàn')).toBeInTheDocument()
    expect(screen.getByText('403')).toBeInTheDocument()
    expect(screen.queryByText('Sửa quyền')).not.toBeInTheDocument()
  })

  it('renders the pinned resolved brief without exposing restricted references', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {},
        resolvedBrief: {
          schemaVersion: 'task-resolved-brief.v1',
          state: 'published',
          audience: 'work_participant',
          resolutionSource: 'assignment_snapshot',
          assignmentSnapshotId: 'snapshot-1',
          assignmentSnapshotHash: 'sha256:1234567890abcdef',
          resolvedContentHash: 'sha256:abcdef1234567890',
          resolvedContract: {
            title: 'Pinned task contract',
            specification: {
              plainText: 'Prepare the verified curriculum handoff.',
              sections: [{ id: 's1', title: 'Scope', plainText: 'Use the approved curriculum.' }],
            },
            work: {
              roleInTask: 'implementer',
              ownershipLevel: 'primary_owner',
              deliverables: [
                { id: 'd1', title: 'Handoff document', description: 'Final document' },
              ],
              acceptanceCriteria: [
                { id: 'a1', statement: 'Reviewer can reproduce the result.', critical: true },
              ],
            },
            evidence: {
              requirements: [
                {
                  id: 'e1',
                  title: 'Review receipt',
                  required: true,
                  privacyClassification: 'internal',
                },
              ],
            },
            inheritedFrom: {
              projectContextVersionId: 'context-v1',
              workPackageVersionId: 'package-v1',
            },
          },
        },
      },
    })

    expect(screen.getByText('Pinned task contract')).toBeInTheDocument()
    expect(screen.getByText(/Task information|Thông tin task/)).toBeInTheDocument()
    expect(screen.getByText('Prepare the verified curriculum handoff.')).toBeInTheDocument()
    expect(screen.getByText('Handoff document')).toBeInTheDocument()
    expect(screen.getByText('Reviewer can reproduce the result.')).toBeInTheDocument()
    expect(screen.queryByText('Review receipt')).not.toBeInTheDocument()
    expect(screen.queryByText(/Inherited context: context-v1/)).not.toBeInTheDocument()
    expect(screen.queryByText(/sha256:/)).not.toBeInTheDocument()
  })

  it('keeps restricted briefs opaque', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {},
        resolvedBrief: {
          schemaVersion: 'task-resolved-brief.v1',
          state: 'restricted',
          audience: 'public_preview',
          resolutionSource: 'restricted',
          restrictionCode: 'TASK_BRIEF_RESTRICTED',
          resolvedContract: null,
        },
      },
    })

    expect(screen.getByText('Bị giới hạn')).toBeInTheDocument()
    expect(screen.getByText(/Không có thông tin hướng dẫn chi tiết|Detailed task instructions are not available/i)).toBeInTheDocument()
    expect(screen.queryByText('Pinned task contract')).not.toBeInTheDocument()
  })

  it('offers stale-brief recovery without rendering the old contract', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {},
        resolvedBrief: {
          schemaVersion: 'task-resolved-brief.v1',
          state: 'restricted',
          audience: 'work_participant',
          resolutionSource: 'restricted',
          restrictionCode: 'TASK_BRIEF_ASSIGNMENT_ACCESS_STALE',
          resolvedContract: { title: 'Old pinned contract' },
        },
      },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      /task information changed|Thông tin task đã thay đổi/i
    )
    expect(screen.getByRole('button', { name: /reload brief|reload task information|tải lại thông tin task/i })).toBeInTheDocument()
    expect(screen.queryByText('Old pinned contract')).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: /reload brief|reload task information|tải lại thông tin task/i })).toBeInTheDocument()
  })

  it('clears stale recovery after the host supplies a fresh projection', async () => {
    const view = render(TaskExecutionBrief, {
      props: {
        task: {},
        resolvedBrief: {
          schemaVersion: 'task-resolved-brief.v1',
          state: 'restricted',
          audience: 'work_participant',
          resolutionSource: 'restricted',
          restrictionCode: 'TASK_BRIEF_ASSIGNMENT_ACCESS_STALE',
          resolvedContract: { title: 'Old pinned contract' },
        },
      },
    })

    expect(screen.getByTestId('stale-brief-recovery')).toBeInTheDocument()

    await view.rerender({
      task: {},
      resolvedBrief: {
        schemaVersion: 'task-resolved-brief.v1',
        state: 'published',
        audience: 'work_participant',
        resolutionSource: 'assignment_snapshot',
        assignmentId: 'assignment-1',
        assignmentSnapshotId: 'snapshot-2',
        assignmentSnapshotHash: 'sha256:fresh',
        resolvedContract: { title: 'Fresh pinned contract' },
      },
    })

    await waitFor(() => {
      expect(screen.queryByTestId('stale-brief-recovery')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Fresh pinned contract')).toBeInTheDocument()
  })

  it('shows material change paths before requiring re-acknowledgement', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {},
        resolvedBrief: {
          schemaVersion: 'task-resolved-brief.v1',
          state: 'published',
          audience: 'work_participant',
          resolutionSource: 'assignment_snapshot',
          assignmentId: 'assignment-1',
          assignmentSnapshotId: 'snapshot-2',
          assignmentSnapshotHash: 'sha256:successor',
          acknowledgementRequired: true,
          acknowledgementState: 'pending',
          changeSummary: {
            changeClass: 'material_scope',
            changedPaths: ['resolvedContract.work.deliverables'],
            requiresReack: true,
            isSuccessor: true,
          },
          resolvedContract: { title: 'Successor task contract' },
        },
      },
    })

    expect(screen.getByTestId('material-change-reack')).toHaveTextContent(
      /material.*change|material.*scope/i
    )
    expect(screen.getByText('resolvedContract.work.deliverables')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Acknowledge this pinned brief' })).not.toBeInTheDocument()
  })

  it('does not ask the assignee to acknowledge or submit the task brief', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {},
        resolvedBrief: {
          schemaVersion: 'task-resolved-brief.v1',
          state: 'published',
          audience: 'work_participant',
          resolutionSource: 'assignment_snapshot',
          assignmentId: 'assignment-1',
          assignmentSnapshotId: 'snapshot-1',
          assignmentSnapshotHash: 'sha256:hash',
          headRevision: 2,
          acknowledgementRequired: true,
          acknowledgementState: 'pending',
          resolvedContract: { title: 'Pinned task contract' },
        },
      },
    })

    expect(screen.queryByRole('button', { name: 'Acknowledge this pinned brief' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /request clarification/i })).not.toBeInTheDocument()
  })

  it('labels supporting references separately from the self-contained brief', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {},
        resolvedBrief: {
          schemaVersion: 'task-resolved-brief.v1',
          state: 'published',
          audience: 'work_participant',
          resolutionSource: 'assignment_snapshot',
          resolvedContract: {
            title: 'Pinned task contract',
            specification: { plainText: 'The local execution brief is complete.' },
            supportingReferences: [
              {
                id: 'reference-1',
                type: 'url',
                uri: 'https://docs.example.test/pre-order',
                title: 'Background documentation',
                relevantSection: 'background',
                relation: 'background',
                accessState: 'authenticated',
                privacyClassification: 'internal',
              },
            ],
          },
        },
      },
    })

    expect(screen.getByText('The local execution brief is complete.')).toBeInTheDocument()
    expect(screen.getByText('Background documentation')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/authenticated/i)
    expect(screen.getByRole('link', { name: 'Background documentation' })).toHaveAttribute(
      'href',
      'https://docs.example.test/pre-order'
    )
  })

  it('shows creator readiness blockers for a Draft without treating a supporting link as the contract', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {},
        resolvedBrief: {
          schemaVersion: 'task-resolved-brief.v1',
          state: 'draft',
          audience: 'creator_edit',
          resolutionSource: 'current_authoring',
          authoring: {
            specification: { plainText: 'Describe the order API scope locally.' },
            supportingReferences: [],
            readiness: {
              assignmentReady: false,
              blockers: [
                {
                  code: 'TVA.WORK.SCOPE_MISSING',
                  message: 'Scope is missing.',
                  remediationHint: 'Describe the in-scope API behavior.',
                },
              ],
              warnings: [],
            },
          },
          resolvedContract: null,
        },
      },
    })

    expect(screen.getByText('Describe the order API scope locally.')).toBeInTheDocument()
    expect(screen.getByText(/Assignment blocked/i)).toBeInTheDocument()
    expect(screen.getByText('Scope is missing.')).toBeInTheDocument()
    expect(screen.getByText('Describe the in-scope API behavior.')).toBeInTheDocument()
  })
})
