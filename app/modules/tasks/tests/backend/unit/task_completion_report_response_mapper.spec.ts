import { test } from '@japa/runner'

import type { TaskCompletionReportFactBundle } from '#modules/tasks/actions/ports/outbound/task_completion_report_repository'
import { mapTaskCompletionReportEditorResponse } from '#modules/tasks/controllers/mappers/response/task-submissions/task_completion_report_response_mapper'

function bundle() {
  return {
    report: {
      id: 'report-1',
      taskSubmissionId: 'submission-1',
      taskId: 'task-1',
      taskAssignmentId: 'assignment-1',
      assignmentSnapshotId: 'snapshot-1',
      assignmentSnapshotHash: `sha256:${'a'.repeat(64)}`,
      taskContractVersionId: 'contract-1',
      reportedBy: 'user-1',
      revision: 2,
      idempotencyKey: 'idempotency-2',
      status: 'draft' as const,
      completionReportHash: `sha256:${'b'.repeat(64)}`,
      canonicalPayload: {
        schemaVersion: 'suar.task_completion_report.v1',
        status: 'draft',
        revision: 2,
        requestHash: `sha256:${'c'.repeat(64)}`,
        validationCodes: ['work_performed_required'],
        report: {
          id: 'report-1',
          taskId: 'task-1',
          taskAssignmentId: 'assignment-1',
          assignmentSnapshotId: 'snapshot-1',
          assignmentSnapshotHash: `sha256:${'a'.repeat(64)}`,
          taskContractVersionId: 'contract-1',
          reportedBy: 'user-1',
          workPerformed: 'Implemented the flow.',
          contributionStatement: 'Owned the API slice.',
          actualRole: 'engineer',
          actualOwnership: 'primary_owner',
          actualAutonomy: 'independent',
          actualDeliverableIds: ['deliverable-1'],
          actualOutcomes: { shipped: true },
          impactObserved: { users: 10 },
          limitations: null,
          remainingWork: 'Monitor adoption.',
          criterionResults: [
            {
              id: 'criterion-result-1',
              criterionId: 'criterion-1',
              expectedOutcome: 'The flow works.',
              actualOutcome: 'The flow works.',
              result: 'met',
              explanation: 'Covered by integration test.',
              evidenceIds: ['evidence-1'],
              deviationStatus: 'none',
              internalOnly: 'must-not-leak',
            },
          ],
          evidence: [
            {
              id: 'evidence-1',
              evidenceRequirementIds: ['requirement-1'],
              criterionIds: ['criterion-1'],
              deliverableIds: ['deliverable-1'],
              ownerUserId: 'user-1',
              contributorUserIds: [],
              reviewerAccessState: 'available',
              availability: 'available',
              privacyClassification: 'internal',
            },
          ],
          contributorClaims: [],
        },
        evidenceManifest: [
          {
            evidenceId: 'evidence-1',
            evidenceType: 'test_report',
            title: 'Integration test',
            description: null,
            uri: 'https://example.test/report',
            storageReference: null,
            versionReference: null,
            contentHash: null,
            capturedAt: null,
            retentionClass: 'secret',
          },
        ],
        canonicalPayload: 'nested-secret',
      },
      reportedAt: null,
    },
    criterionResults: [{ completion_report_id: 'report-1', created_at: 'secret' }],
    evidenceManifest: [],
    contributorClaims: [],
    evidenceMappings: [],
  } satisfies TaskCompletionReportFactBundle
}

test.group('Completion Report editor response mapper', () => {
  test('emits an explicit editor allowlist and never serializes persistence payloads', ({ assert }) => {
    const response = mapTaskCompletionReportEditorResponse(bundle())
    const serialized = JSON.stringify(response)

    assert.equal(response.schemaVersion, 'suar.task_completion_report_editor.v1')
    assert.equal(response.revision, 2)
    assert.deepEqual(response.blockerCodes, ['work_performed_required'])
    assert.equal(response.report['criterionResults'][0]?.['criterionId'], 'criterion-1')
    assert.equal(response.evidenceManifest[0]?.['evidenceId'], 'evidence-1')
    assert.notInclude(serialized, 'canonicalPayload')
    assert.notInclude(serialized, 'requestHash')
    assert.notInclude(serialized, 'completion_report_id')
    assert.notInclude(serialized, 'created_at')
    assert.notInclude(serialized, 'must-not-leak')
    assert.notInclude(serialized, 'retentionClass')
  })

  test('fails closed when the immutable canonical payload is malformed', ({ assert }) => {
    const original = bundle()
    const malformed: TaskCompletionReportFactBundle = {
      ...original,
      report: {
        ...original.report,
        canonicalPayload: { schemaVersion: 'suar.task_completion_report.v1' },
      },
    }

    assert.throws(() => mapTaskCompletionReportEditorResponse(malformed), /canonical payload/i)
  })
})
