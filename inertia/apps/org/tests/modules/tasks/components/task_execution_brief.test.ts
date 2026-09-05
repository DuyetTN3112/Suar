import { render, screen, waitFor } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import TaskExecutionBrief from '@/apps/org/modules/tasks/components/detail/task_execution_brief.svelte'

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

  it('renders a pinned resolved brief and keeps restricted state opaque', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {},
        resolvedBrief: {
          schemaVersion: 'task-resolved-brief.v1',
          state: 'published',
          audience: 'work_participant',
          resolutionSource: 'assignment_snapshot',
          assignmentSnapshotId: 'snapshot-org-1',
          assignmentSnapshotHash: 'sha256:1234567890abcdef',
          resolvedContract: {
            title: 'Pinned org contract',
            specification: { plainText: 'Use the approved org scope.' },
            work: {
              roleInTask: 'implementer',
              ownershipLevel: 'primary_owner',
              deliverables: [{ id: 'd1', title: 'Org handoff' }],
              acceptanceCriteria: [{ id: 'a1', statement: 'Evidence is reviewable.' }],
            },
            evidence: { requirements: [{ id: 'e1', title: 'Evidence package', required: true }] },
            inheritedFrom: { projectContextVersionId: 'org-context-v1' },
          },
        },
      },
    })

    expect(screen.getByText('Pinned org contract')).toBeInTheDocument()
    expect(screen.getByText(/Task information|Thông tin task/)).toBeInTheDocument()
    expect(screen.getByText('Org handoff')).toBeInTheDocument()
    expect(screen.queryByText('Evidence package')).not.toBeInTheDocument()
    expect(screen.queryByText(/sha256:/)).not.toBeInTheDocument()
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
          resolvedContract: { title: 'Old org contract' },
        },
      },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      /task information changed|Thông tin task đã thay đổi/i
    )
    expect(screen.getByRole('button', { name: /reload brief|reload task information|tải lại thông tin task/i })).toBeInTheDocument()
    expect(screen.queryByText('Old org contract')).not.toBeInTheDocument()

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
          resolvedContract: { title: 'Old org contract' },
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
        assignmentId: 'assignment-org-1',
        assignmentSnapshotId: 'snapshot-org-2',
        assignmentSnapshotHash: 'sha256:fresh-org',
        resolvedContract: { title: 'Fresh org contract' },
      },
    })

    await waitFor(() => {
      expect(screen.queryByTestId('stale-brief-recovery')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Fresh org contract')).toBeInTheDocument()
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
          assignmentId: 'assignment-org-1',
          assignmentSnapshotId: 'snapshot-org-2',
          assignmentSnapshotHash: 'sha256:successor-org',
          acknowledgementRequired: true,
          acknowledgementState: 'pending',
          changeSummary: {
            changeClass: 'acceptance',
            changedPaths: ['resolvedContract.work.acceptanceCriteria'],
            requiresReack: true,
            isSuccessor: true,
          },
          resolvedContract: { title: 'Successor org contract' },
        },
      },
    })

    expect(screen.getByTestId('material-change-reack')).toHaveTextContent(
      /material.*change|acceptance/i
    )
    expect(screen.getByText('resolvedContract.work.acceptanceCriteria')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Acknowledge this pinned brief' })).not.toBeInTheDocument()
  })

  it('does not expose clarification or acknowledgement controls to the assignee', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {},
        resolvedBrief: {
          schemaVersion: 'task-resolved-brief.v1',
          state: 'published',
          audience: 'work_participant',
          resolutionSource: 'assignment_snapshot',
          assignmentId: 'assignment-org-1',
          assignmentSnapshotId: 'snapshot-org-1',
          assignmentSnapshotHash: 'sha256:hash',
          headRevision: 3,
          acknowledgementRequired: true,
          acknowledgementState: 'pending',
          resolvedContract: { title: 'Pinned org contract' },
        },
      },
    })

    expect(screen.queryByLabelText('Ask for clarification')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request clarification' })).not.toBeInTheDocument()
    expect(screen.queryByText('clarification_requested')).not.toBeInTheDocument()
  })

  it('labels unavailable supporting references as warnings without hiding the local brief', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {},
        resolvedBrief: {
          schemaVersion: 'task-resolved-brief.v1',
          state: 'published',
          audience: 'work_participant',
          resolutionSource: 'assignment_snapshot',
          resolvedContract: {
            title: 'Pinned org contract',
            specification: { plainText: 'The local org brief remains executable.' },
            supportingReferences: [
              {
                id: 'reference-org-1',
                type: 'url',
                uri: 'https://docs.example.test/restricted',
                title: 'Restricted incident notes',
                relevantSection: 'background',
                relation: 'background',
                accessState: 'unavailable',
                privacyClassification: 'restricted',
              },
            ],
          },
        },
      },
    })

    expect(screen.getByText('The local org brief remains executable.')).toBeInTheDocument()
    expect(screen.getByText('Restricted incident notes')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Không thể truy cập/i)
  })

  it('shows creator readiness blockers for an unpublished Draft', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {},
        resolvedBrief: {
          schemaVersion: 'task-resolved-brief.v1',
          state: 'draft',
          audience: 'creator_edit',
          resolutionSource: 'current_authoring',
          authoring: {
            specification: { plainText: 'Keep the complete specification inside Suar.' },
            supportingReferences: [],
            readiness: {
              assignmentReady: false,
              blockers: [
                {
                  code: 'TVA.WORK.DELIVERABLES_MISSING',
                  message: 'Deliverables are missing.',
                  remediationHint: 'Add the expected handoff.',
                },
              ],
              warnings: [],
            },
          },
          resolvedContract: null,
        },
      },
    })

    expect(screen.getByText('Keep the complete specification inside Suar.')).toBeInTheDocument()
    expect(screen.getByText(/Assignment blocked/i)).toBeInTheDocument()
    expect(screen.getByText('Deliverables are missing.')).toBeInTheDocument()
    expect(screen.getByText('Add the expected handoff.')).toBeInTheDocument()
  })
})
