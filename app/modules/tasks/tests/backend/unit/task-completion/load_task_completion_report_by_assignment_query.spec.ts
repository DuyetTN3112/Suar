import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type {
  PersistedTaskCompletionReport,
  TaskCompletionReportFactBundle,
  TaskCompletionReportRepository,
} from '#modules/tasks/actions/ports/outbound/task_completion_report_repository'
import LoadTaskCompletionReportByAssignmentQuery from '#modules/tasks/actions/queries/task-submissions/load_task_completion_report_by_assignment_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

const ASSIGNMENT_ID = 'assignment-1'
const ACTOR_ID = 'user-1'

function context(userId: string | null): TaskActionContext {
  return {
    userId,
    ip: '127.0.0.1',
    userAgent: 'unit-test',
    organizationId: 'org-1',
  }
}

function report(overrides: Partial<PersistedTaskCompletionReport> = {}): PersistedTaskCompletionReport {
  return {
    id: 'report-1',
    taskSubmissionId: 'submission-1',
    taskId: 'task-1',
    taskAssignmentId: ASSIGNMENT_ID,
    assignmentSnapshotId: 'snapshot-1',
    assignmentSnapshotHash: `sha256:${'a'.repeat(64)}`,
    taskContractVersionId: 'contract-1',
    reportedBy: ACTOR_ID,
    revision: 2,
    idempotencyKey: 'completion-2',
    status: 'draft',
    completionReportHash: `sha256:${'b'.repeat(64)}`,
    canonicalPayload: { schemaVersion: 'suar.task_completion_report.v1' },
    reportedAt: null,
    ...overrides,
  }
}

function bundle(overrides: Partial<PersistedTaskCompletionReport> = {}): TaskCompletionReportFactBundle {
  return {
    report: report(overrides),
    criterionResults: [{ completion_report_id: 'report-1', criterion_id: 'criterion-1' }],
    evidenceManifest: [],
    contributorClaims: [],
    evidenceMappings: [],
  }
}

function repository(value: TaskCompletionReportFactBundle | null): TaskCompletionReportRepository {
  return {
    findLatestFactBundleByAssignment: () => Promise.resolve(value),
  } as unknown as TaskCompletionReportRepository
}

test.group('Load Completion Report by assignment', () => {
  test('hydrates the latest native fact bundle for its reporting assignee', async ({ assert }) => {
    const expected = bundle()
    const loaded = await new LoadTaskCompletionReportByAssignmentQuery(
      context(ACTOR_ID),
      repository(expected)
    ).execute(ASSIGNMENT_ID)

    assert.deepEqual(loaded, expected)
  })

  test('returns an empty draft state when the assignment has no native report', async ({ assert }) => {
    const loaded = await new LoadTaskCompletionReportByAssignmentQuery(
      context(ACTOR_ID),
      repository(null)
    ).execute(ASSIGNMENT_ID)

    assert.isNull(loaded)
  })

  test('requires authentication and does not expose another assignee report', async ({ assert }) => {
    await assert.rejects(
      () =>
        new LoadTaskCompletionReportByAssignmentQuery(context(null), repository(bundle())).execute(
          ASSIGNMENT_ID
        ),
      UnauthorizedException
    )
    await assert.rejects(
      () =>
        new LoadTaskCompletionReportByAssignmentQuery(
          context('other-user'),
          repository(bundle())
        ).execute(ASSIGNMENT_ID),
      ForbiddenException
    )
  })
})
