import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import StartTaskCompletionReportCommand, {
  type StartTaskCompletionReportDependencies,
} from '#modules/tasks/actions/commands/task-submissions/start_task_completion_report_command'
import type { TaskAssignmentContractRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type {
  TaskCompletionRepository,
  TaskSubmissionRecord,
} from '#modules/tasks/actions/ports/outbound/task_completion_repository'
import type { TaskTransactionRunner } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

const SNAPSHOT_HASH = `sha256:${'a'.repeat(64)}`

function context(overrides: Partial<TaskActionContext> = {}): TaskActionContext {
  return {
    userId: 'assignee-1',
    ip: '127.0.0.1',
    userAgent: 'unit-test',
    organizationId: 'org-1',
    ...overrides,
  }
}

function interactionContext(overrides: Record<string, unknown> = {}) {
  return {
    assignmentId: 'assignment-1',
    assigneeId: 'assignee-1',
    assignmentState: 'active' as const,
    taskState: 'active' as const,
    assigneeActive: true,
    acknowledgementRequired: true,
    clarificationOpen: false,
    currentSnapshot: {
      snapshotId: 'snapshot-1',
      snapshotHash: SNAPSHOT_HASH,
      contractVersionHead: 1,
    },
    existingAcknowledgement: null,
    ...overrides,
  }
}

function currentSnapshot() {
  return {
    id: 'snapshot-1',
    assignmentId: 'assignment-1',
    taskId: 'task-1',
    sequence: 1,
    previousSnapshotId: null,
    envelope: {
      snapshot: {
        taskId: 'task-1',
        assigneeId: 'assignee-1',
        resolvedContract: { versionId: 'contract-1' },
      },
    },
    snapshotHash: SNAPSHOT_HASH,
    acknowledgementRequired: true,
    acknowledgementState: 'pending' as const,
    idempotencyKey: 'snapshot-1',
    replayed: false,
  }
}

function parent(overrides: Partial<TaskSubmissionRecord> = {}): TaskSubmissionRecord {
  return {
    id: 'submission-1',
    task_assignment_id: 'assignment-1',
    task_id: 'task-1',
    submitted_by: 'assignee-1',
    summary: '',
    implementation_notes: null,
    known_limitations: null,
    test_notes: null,
    demo_url: null,
    repository_url: null,
    pull_request_url: null,
    status: 'draft',
    locked_at: null,
    ...overrides,
  }
}

function dependencies(options: {
  existingParent?: TaskSubmissionRecord | null
  interaction?: Record<string, unknown>
} = {}) {
  let upsertPayload: Record<string, unknown> | undefined
  let upsertCalls = 0
  const repository = {
    lockSubmissionByAssignment: () => Promise.resolve(options.existingParent ?? null),
    upsertSubmission: (
      _existingId: string | null,
      payload: Record<string, unknown>
    ) => {
      upsertCalls += 1
      upsertPayload = payload
      return Promise.resolve(parent())
    },
  } as unknown as TaskCompletionRepository
  const assignmentContracts = {
    lockInteractionContext: () => Promise.resolve(interactionContext(options.interaction)),
    findCurrent: () => Promise.resolve(currentSnapshot()),
  } as unknown as TaskAssignmentContractRepository
  const transactions: TaskTransactionRunner = {
    run: (work) => work({}),
  }
  return {
    dependencies: {
      repository,
      assignmentContracts,
      transactions,
    } satisfies StartTaskCompletionReportDependencies,
    getUpsertPayload: () => upsertPayload,
    getUpsertCalls: () => upsertCalls,
  }
}

test.group('StartTaskCompletionReportCommand', () => {
  test('creates one draft parent pinned to the current assignment snapshot', async ({ assert }) => {
    const fixture = dependencies()
    const result = await new StartTaskCompletionReportCommand(
      context(),
      fixture.dependencies
    ).execute('assignment-1')

    assert.deepEqual(result, {
      taskSubmissionId: 'submission-1',
      taskId: 'task-1',
      taskAssignmentId: 'assignment-1',
      assigneeId: 'assignee-1',
      assignmentSnapshotId: 'snapshot-1',
      assignmentSnapshotHash: SNAPSHOT_HASH,
      taskContractVersionId: 'contract-1',
      status: 'draft',
      replayed: false,
    })
    assert.deepEqual(fixture.getUpsertPayload(), {
      task_assignment_id: 'assignment-1',
      task_id: 'task-1',
      submitted_by: 'assignee-1',
      summary: '',
      implementation_notes: null,
      known_limitations: null,
      test_notes: null,
      demo_url: null,
      repository_url: null,
      pull_request_url: null,
      status: 'draft',
      submitted_at: null,
      locked_at: null,
    })
  })

  test('allows draft start before acknowledgement; submit remains the gated action', async ({
    assert,
  }) => {
    const fixture = dependencies({ interaction: { acknowledgementRequired: true } })

    const result = await new StartTaskCompletionReportCommand(
      context(),
      fixture.dependencies
    ).execute('assignment-1')

    assert.equal(result.status, 'draft')
    assert.equal(fixture.getUpsertCalls(), 1)
  })

  test('reuses the existing parent without writing a second row', async ({ assert }) => {
    const fixture = dependencies({ existingParent: parent({ status: 'needs_changes' }) })

    const result = await new StartTaskCompletionReportCommand(
      context(),
      fixture.dependencies
    ).execute('assignment-1')

    assert.equal(result.taskSubmissionId, 'submission-1')
    assert.equal(result.status, 'needs_changes')
    assert.isTrue(result.replayed)
    assert.equal(fixture.getUpsertCalls(), 0)
  })

  test('rejects a non-assignee before touching the submission parent', async ({ assert }) => {
    const fixture = dependencies()
    const command = new StartTaskCompletionReportCommand(
      context({ userId: 'outsider-1' }),
      fixture.dependencies
    )

    await assert.rejects(() => command.execute('assignment-1'), ForbiddenException)
    assert.equal(fixture.getUpsertCalls(), 0)
  })
})
