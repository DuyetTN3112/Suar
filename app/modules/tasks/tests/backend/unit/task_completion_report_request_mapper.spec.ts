import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildTaskCompletionReportInput } from '#modules/tasks/controllers/mappers/request/task-submissions/task_completion_report_request'

const snapshotHash = `sha256:${'a'.repeat(64)}` as const

function report() {
  return {
    id: 'report-1',
    taskId: 'task-1',
    taskAssignmentId: 'assignment-1',
    assignmentSnapshotId: 'snapshot-1',
    assignmentSnapshotHash: snapshotHash,
    taskContractVersionId: 'contract-1',
    reportedBy: 'user-1',
    workPerformed: 'Implemented the requested change',
    contributionStatement: 'Owned the implementation and verification',
    actualRole: 'Backend engineer',
    actualOwnership: 'primary_owner',
    actualAutonomy: 'supervised',
    actualDeliverableIds: ['deliverable-1'],
    actualOutcomes: { outcome: 'completed' },
    impactObserved: { users: 10 },
    limitations: null,
    remainingWork: null,
    criterionResults: [],
    evidence: [],
    contributorClaims: [],
  }
}

function context(body: Record<string, unknown>, assignmentId = 'assignment-1') {
  return {
    params: { assignmentId },
    request: { only: () => body },
  }
}

test.group('Task Completion Report request mapper', () => {
  test('maps the native envelope and binds it to the assignment route', ({ assert }) => {
    const input = buildTaskCompletionReportInput(
      context({
        taskSubmissionId: 'submission-1',
        expectedRevision: 0,
        idempotencyKey: 'completion-request-1',
        report: report(),
        evidenceManifest: [],
      }) as never
    )

    assert.equal(input.taskSubmissionId, 'submission-1')
    assert.equal(input.expectedRevision, 0)
    assert.equal(input.idempotencyKey, 'completion-request-1')
    assert.equal(input.report.taskAssignmentId, 'assignment-1')
    assert.deepEqual(input.report.actualOutcomes, { outcome: 'completed' })
    assert.deepEqual(input.evidenceManifest, [])
  })

  test('rejects an envelope without a submission id or with a different assignment', ({ assert }) => {
    const body = {
      expectedRevision: 0,
      idempotencyKey: 'completion-request-1',
      report: report(),
      evidenceManifest: [],
    }

    assert.throws(
      () => buildTaskCompletionReportInput(context(body) as never),
      ValidationException
    )

    assert.throws(
      () =>
        buildTaskCompletionReportInput(
          context({
            ...body,
            taskSubmissionId: 'submission-1',
            report: { ...report(), taskAssignmentId: 'assignment-other' },
          }) as never
        ),
      ValidationException
    )
  })

  test('keeps semantically incomplete report fields valid for draft persistence', ({ assert }) => {
    const input = buildTaskCompletionReportInput(
      context({
        taskSubmissionId: 'submission-1',
        expectedRevision: 0,
        idempotencyKey: 'completion-draft-1',
        report: {
          ...report(),
          workPerformed: '',
          contributionStatement: '',
          actualRole: '',
          actualOwnership: null,
          actualOutcomes: {},
          impactObserved: {},
        },
        evidenceManifest: [],
      }) as never
    )

    assert.equal(input.report.workPerformed, '')
    assert.isNull(input.report.actualOwnership)
  })
})
