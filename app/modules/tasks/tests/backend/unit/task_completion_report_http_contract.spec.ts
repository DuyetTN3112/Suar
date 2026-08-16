import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import type { TaskCompletionApplicationFactory } from '#modules/tasks/actions/ports/inbound/task_completion_application_factory'
import type {
  PersistedTaskCompletionReport,
  TaskCompletionReportFactBundle,
} from '#modules/tasks/actions/ports/outbound/task_completion_report_repository'
import type { TaskCompletionReviewPackageV1 } from '#modules/tasks/actions/queries/task-submissions/load_task_completion_review_package_query'
import TaskSubmissionController from '#modules/tasks/controllers/task-submissions/task_submission_controller'

function httpContext(body: Record<string, unknown> = {}) {
  let responseBody: unknown
  const ctx = {
    params: { assignmentId: 'assignment-1', reportId: 'report-1' },
    auth: { user: { id: 'user-1' } },
    currentOrganizationId: 'org-1',
    request: {
      ip: () => '127.0.0.1',
      header: () => 'unit-test',
      only: () => body,
    },
    response: {
      status: () => ({ json: (value: unknown) => { responseBody = value } }),
    },
    session: { get: () => undefined },
  }
  return { ctx, body: () => responseBody }
}

function reviewPackage(): TaskCompletionReviewPackageV1 {
  return {
    schemaVersion: 'suar.task_completion_review_package.v1',
    reportId: 'report-1',
    taskId: 'task-1',
    taskAssignmentId: 'assignment-1',
    reportRevision: 1,
    completionReportHash: `sha256:${'b'.repeat(64)}`,
    assignmentContract: {
      snapshot: {
        id: 'snapshot-1',
        assignmentId: 'assignment-1',
        taskId: 'task-1',
        snapshotHash: `sha256:${'a'.repeat(64)}`,
        resolvedContract: {
          taskId: 'task-1',
          versionId: 'contract-1',
          title: 'Contract',
          work: {},
          evidence: {},
        },
      },
    },
    reportCanonicalPayload: {
      report: {
        id: 'report-1',
        workPerformed: 'done',
        requestHash: `sha256:${'c'.repeat(64)}`,
        privateInternalField: 'must-not-leak',
      },
    },
    criterionResults: [
      {
        id: 'criterion-result-1',
        completion_report_id: 'report-1',
        criterion_id: 'criterion-1',
        actual_outcome: 'done',
      },
    ],
    evidenceManifest: [
      {
        id: 'evidence-1',
        evidence_type: 'document_link',
        uri: 'https://private.example/token',
        storage_reference: 'private-storage-key',
      },
    ],
    contributorClaims: [],
    evidenceMappings: [],
    packageHash: `sha256:${'d'.repeat(64)}`,
  }
}

function factBundle(): TaskCompletionReportFactBundle {
  const report: PersistedTaskCompletionReport = {
    id: 'report-1',
    taskSubmissionId: 'submission-1',
    taskId: 'task-1',
    taskAssignmentId: 'assignment-1',
    assignmentSnapshotId: 'snapshot-1',
    assignmentSnapshotHash: `sha256:${'a'.repeat(64)}`,
    taskContractVersionId: 'contract-1',
    reportedBy: 'user-1',
    revision: 1,
    idempotencyKey: 'draft-1',
    status: 'draft',
    completionReportHash: `sha256:${'b'.repeat(64)}`,
    canonicalPayload: {
      schemaVersion: 'suar.task_completion_report.v1',
      status: 'draft',
      revision: 1,
      requestHash: `sha256:${'c'.repeat(64)}`,
      validationCodes: [],
      report: {
        id: 'report-1',
        taskId: 'task-1',
        taskAssignmentId: 'assignment-1',
        assignmentSnapshotId: 'snapshot-1',
        assignmentSnapshotHash: `sha256:${'a'.repeat(64)}`,
        taskContractVersionId: 'contract-1',
        reportedBy: 'user-1',
        workPerformed: '',
        contributionStatement: '',
        actualRole: '',
        actualOwnership: null,
        actualAutonomy: null,
        actualDeliverableIds: [],
        actualOutcomes: {},
        impactObserved: {},
        limitations: null,
        remainingWork: null,
        criterionResults: [],
        evidence: [],
        contributorClaims: [],
      },
      evidenceManifest: [],
    },
    reportedAt: null,
  }
  return {
    report,
    criterionResults: [],
    evidenceManifest: [],
    contributorClaims: [],
    evidenceMappings: [],
  }
}

test.group('Completion Report HTTP contract', () => {
  test('returns an explicit empty state when the assignment has no native report', async ({ assert }) => {
    const applications = {
      makeGetCompletionReport: () => ({ executeAndWrap: () => Promise.resolve(Result.ok(null)) }),
    } as unknown as TaskCompletionApplicationFactory
    const request = httpContext()

    await new TaskSubmissionController(applications).showCompletionReport(request.ctx as never)

    assert.deepEqual(request.body(), { data: null })
  })

  test('hydrates a draft through the safe editor DTO without exposing persistence fields', async ({ assert }) => {
    const applications = {
      makeGetCompletionReport: () => ({
        executeAndWrap: () => Promise.resolve(Result.ok(factBundle())),
      }),
    } as unknown as TaskCompletionApplicationFactory
    const request = httpContext()

    await new TaskSubmissionController(applications).showCompletionReport(request.ctx as never)

    const body = request.body() as { data: Record<string, unknown> }
    assert.equal(body.data['schemaVersion'], 'suar.task_completion_report_editor.v1')
    assert.notProperty(body.data, 'canonicalPayload')
    assert.notProperty(body.data, 'criterionResults')
    assert.notInclude(JSON.stringify(body), 'requestHash')
    assert.notInclude(JSON.stringify(body), 'completion_report_id')
  })

  test('keeps native draft and submit POST responses on the same editor allowlist', async ({
    assert,
  }) => {
    const persisted = factBundle().report
    const requestBody = {
      taskSubmissionId: persisted.taskSubmissionId,
      expectedRevision: 0,
      idempotencyKey: 'request-1',
      report: (persisted.canonicalPayload as Record<string, unknown>)['report'],
      evidenceManifest: [],
    }
    const result = { ...persisted, replayed: false, blockerCodes: [] }
    const applications = {
      makeSaveCompletionReportDraft: () => ({
        executeAndWrap: () => Promise.resolve(Result.ok(result)),
      }),
      makeSubmitCompletionReport: () => ({
        executeAndWrap: () => Promise.resolve(Result.ok(result)),
      }),
    } as unknown as TaskCompletionApplicationFactory

    for (const method of ['saveCompletionReportDraft', 'submitCompletionReport'] as const) {
      const request = httpContext(requestBody)
      await new TaskSubmissionController(applications)[method](request.ctx as never)

      const body = request.body() as { data: Record<string, unknown> }
      assert.equal(body.data['schemaVersion'], 'suar.task_completion_report_editor.v1')
      assert.equal(body.data['id'], persisted.id)
      assert.notProperty(body.data, 'canonicalPayload')
      assert.notProperty(body.data, 'idempotencyKey')
      assert.notProperty(body.data, 'replayed')
      assert.notInclude(JSON.stringify(body), 'requestHash')
    }
  })

  test('starts a native Completion Report through the assignment-scoped command', async ({
    assert,
  }) => {
    let receivedAssignmentId: string | undefined
    const applications = {
      makeStartCompletionReport: () => ({
        executeAndWrap: (assignmentId: string) => {
          receivedAssignmentId = assignmentId
          return Promise.resolve(
            Result.ok({
              taskSubmissionId: 'submission-1',
              taskId: 'task-1',
              taskAssignmentId: 'assignment-1',
              assigneeId: 'user-1',
              assignmentSnapshotId: 'snapshot-1',
              assignmentSnapshotHash: `sha256:${'a'.repeat(64)}`,
              taskContractVersionId: 'contract-1',
              status: 'draft',
              replayed: false,
            })
          )
        },
      }),
    } as unknown as TaskCompletionApplicationFactory
    const request = httpContext()

    await new TaskSubmissionController(applications).startCompletionReport(request.ctx as never)

    assert.equal(receivedAssignmentId, 'assignment-1')
    assert.deepEqual(request.body(), {
      data: {
        taskSubmissionId: 'submission-1',
        taskId: 'task-1',
        taskAssignmentId: 'assignment-1',
        assigneeId: 'user-1',
        assignmentSnapshotId: 'snapshot-1',
        assignmentSnapshotHash: `sha256:${'a'.repeat(64)}`,
        taskContractVersionId: 'contract-1',
        status: 'draft',
        replayed: false,
      },
    })
  })

  test('returns the reviewer package through its safe editor response contract', async ({
    assert,
  }) => {
    const applications = {
      makeGetCompletionReviewPackage: () => ({
        executeAndWrap: () => Promise.resolve(Result.ok(reviewPackage())),
      }),
    } as unknown as TaskCompletionApplicationFactory
    const request = httpContext()

    await new TaskSubmissionController(applications).showCompletionReviewPackage(
      request.ctx as never
    )

    const body = request.body() as { data: Record<string, unknown> }
    assert.equal(body.data['schemaVersion'], 'suar.task_completion_review_package_editor.v1')
    assert.equal(body.data['reportId'], 'report-1')
    assert.notProperty(body.data, 'reportCanonicalPayload')
    assert.notInclude(JSON.stringify(body), 'requestHash')
    assert.notInclude(JSON.stringify(body), 'privateInternalField')
    assert.notInclude(JSON.stringify(body), 'private.example')
    assert.notInclude(JSON.stringify(body), 'storage_reference')
  })
})
