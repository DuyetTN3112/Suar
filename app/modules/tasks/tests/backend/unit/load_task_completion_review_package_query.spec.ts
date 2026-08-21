import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type {
  TaskAssignmentContractRepository,
  TaskAssignmentContractSnapshotRecord,
} from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type {
  PersistedTaskCompletionReport,
  TaskCompletionReportRepository,
} from '#modules/tasks/actions/ports/outbound/task_completion_report_repository'
import LoadTaskCompletionReviewPackageQuery from '#modules/tasks/actions/queries/task-submissions/load_task_completion_review_package_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { CanonicalTaskAssignmentContractSnapshotV1 } from '#modules/tasks/domain/task-assignment/task_assignment_contract_snapshot'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'
import type { TvaJsonObject } from '#modules/tasks/public_contracts/task-authoring/primitives'

const ACTOR_ID = '10000000-0000-4000-8000-000000000001'
const REVIEWER_ID = '10000000-0000-4000-8000-000000000002'
const REPORT_ID = '10000000-0000-4000-8000-000000000003'
const TASK_ID = '10000000-0000-4000-8000-000000000004'
const ASSIGNMENT_ID = '10000000-0000-4000-8000-000000000005'
const SNAPSHOT_ID = '10000000-0000-4000-8000-000000000006'
const CONTRACT_ID = '10000000-0000-4000-8000-000000000007'
const SNAPSHOT_HASH = `sha256:${'a'.repeat(64)}` as const
const hasher = new NodeTaskContractContentHasher()
const canonicalPayload: TvaJsonObject = {
  schemaVersion: 'suar.task_completion_report.v1',
  report: { id: REPORT_ID },
}

function report(overrides: Partial<PersistedTaskCompletionReport> = {}): PersistedTaskCompletionReport {
  return {
    id: REPORT_ID,
    taskSubmissionId: '10000000-0000-4000-8000-000000000008',
    taskId: TASK_ID,
    taskAssignmentId: ASSIGNMENT_ID,
    assignmentSnapshotId: SNAPSHOT_ID,
    assignmentSnapshotHash: SNAPSHOT_HASH,
    taskContractVersionId: CONTRACT_ID,
    reportedBy: ACTOR_ID,
    revision: 1,
    idempotencyKey: 'review-package-unit',
    status: 'submitted',
    completionReportHash: hasher.hash(canonicalPayload),
    canonicalPayload,
    reportedAt: '2026-08-01T12:00:00.000Z',
    ...overrides,
  }
}

function snapshot(overrides: Partial<TaskAssignmentContractSnapshotRecord> = {}) {
  const envelope = {
    snapshot: {
      id: SNAPSHOT_ID,
      assignmentId: ASSIGNMENT_ID,
      taskId: TASK_ID,
      snapshotHash: SNAPSHOT_HASH,
      resolvedContract: { versionId: CONTRACT_ID },
    },
  } as unknown as CanonicalTaskAssignmentContractSnapshotV1
  return {
    id: SNAPSHOT_ID,
    assignmentId: ASSIGNMENT_ID,
    taskId: TASK_ID,
    sequence: 1,
    previousSnapshotId: null,
    envelope,
    snapshotHash: SNAPSHOT_HASH,
    acknowledgementRequired: true,
    acknowledgementState: 'acknowledged' as const,
    idempotencyKey: 'snapshot-unit',
    replayed: false,
    ...overrides,
  } satisfies TaskAssignmentContractSnapshotRecord
}

function context(userId: string | null): TaskActionContext {
  return {
    userId,
    ip: '127.0.0.1',
    userAgent: 'unit-test',
    organizationId: null,
  }
}

function dependencies(input: {
  report?: PersistedTaskCompletionReport
  history?: readonly TaskAssignmentContractSnapshotRecord[]
  grant?: boolean
}) {
  const persisted = input.report ?? report()
  return {
    reports: {
      findAccessIdentityById: () =>
        Promise.resolve({
          id: persisted.id,
          taskId: persisted.taskId,
          taskAssignmentId: persisted.taskAssignmentId,
          reportedBy: persisted.reportedBy,
          status: persisted.status,
        }),
      findFactBundleById: () =>
        Promise.resolve({
          report: persisted,
          criterionResults: [],
          evidenceManifest: [],
          contributorClaims: [],
          evidenceMappings: [],
        }),
    } as unknown as TaskCompletionReportRepository,
    assignmentContracts: {
      findHistory: () => Promise.resolve(input.history ?? [snapshot()]),
    } as unknown as TaskAssignmentContractRepository,
    access: { canRead: () => Promise.resolve(input.grant ?? false) },
    hasher,
  }
}

test.group('Unit | Load Task Completion Review Package', () => {
  test('builds a stable package for owner and explicitly granted reviewer', async ({ assert }) => {
    const owner = await new LoadTaskCompletionReviewPackageQuery(
      context(ACTOR_ID),
      dependencies({})
    ).execute(REPORT_ID)
    const reviewer = await new LoadTaskCompletionReviewPackageQuery(
      context(REVIEWER_ID),
      dependencies({ grant: true })
    ).execute(REPORT_ID)

    assert.equal(owner.packageHash, reviewer.packageHash)
    assert.equal(owner.assignmentContract.snapshot.id, SNAPSHOT_ID)
  })

  test('rejects guest and actor without a reviewer grant', async ({ assert }) => {
    await assert.rejects(
      () =>
        new LoadTaskCompletionReviewPackageQuery(context(null), dependencies({})).execute(
          REPORT_ID
        ),
      UnauthorizedException
    )
    await assert.rejects(
      () =>
        new LoadTaskCompletionReviewPackageQuery(
          context(REVIEWER_ID),
          dependencies({ grant: false })
        ).execute(REPORT_ID),
      ForbiddenException
    )
  })

  test('does not expose a draft as a review package even when access is granted', async ({ assert }) => {
    await assert.rejects(
      () =>
        new LoadTaskCompletionReviewPackageQuery(
          context(REVIEWER_ID),
          dependencies({ report: report({ status: 'draft' }), grant: true })
        ).execute(REPORT_ID),
      NotFoundException
    )
  })

  test('fails closed for a forged report hash or foreign immutable snapshot', async ({ assert }) => {
    await assert.rejects(
      () =>
        new LoadTaskCompletionReviewPackageQuery(
          context(ACTOR_ID),
          dependencies({
            report: report({ completionReportHash: `sha256:${'f'.repeat(64)}` }),
          })
        ).execute(REPORT_ID),
      PersistedDataIntegrityException
    )
    await assert.rejects(
      () =>
        new LoadTaskCompletionReviewPackageQuery(
          context(ACTOR_ID),
          dependencies({ history: [snapshot({ taskId: 'foreign-task' })] })
        ).execute(REPORT_ID),
      PersistedDataIntegrityException
    )
  })

  test('wraps expected application failures at the controller boundary', async ({ assert }) => {
    const denied = await new LoadTaskCompletionReviewPackageQuery(
      context(REVIEWER_ID),
      dependencies({ grant: false })
    ).executeAndWrap(REPORT_ID)
    assert.isTrue(denied.isFailure())
    assert.instanceOf(denied.getError(), ForbiddenException)

    const success = await new LoadTaskCompletionReviewPackageQuery(
      context(ACTOR_ID),
      dependencies({})
    ).executeAndWrap(REPORT_ID)
    assert.isTrue(success.isSuccess())
    assert.equal(success.getValue().reportId, REPORT_ID)
  })
})
