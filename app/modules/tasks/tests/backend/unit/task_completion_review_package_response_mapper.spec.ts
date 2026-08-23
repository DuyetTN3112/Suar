import { test } from '@japa/runner'

import type { TaskCompletionReviewPackageV1 } from '#modules/tasks/actions/queries/task-submissions/load_task_completion_review_package_query'
import { mapTaskCompletionReviewPackageResponse } from '#modules/tasks/controllers/mappers/response/task-submissions/task_completion_review_package_response_mapper'

const HASH = `sha256:${'a'.repeat(64)}` as const

function packageFixture(): TaskCompletionReviewPackageV1 {
  const assignmentContract: TaskCompletionReviewPackageV1['assignmentContract'] = {
    schemaVersion: 'suar.task_assignment_contract_snapshot.v1',
    snapshot: {
      id: 'snapshot-1',
      assignmentId: 'assignment-1',
      taskId: 'task-1',
      snapshotHash: HASH,
      roleInTask: 'engineer',
      ownershipLevel: 'primary_owner',
      resolvedContract: {
        versionId: 'contract-1',
        title: 'Implement API lifecycle',
        work: {
          action: 'implement',
          object: 'API lifecycle',
          problemStatement: 'The workflow is incomplete',
          desiredOutcome: 'A verified lifecycle',
          acceptanceCriteria: [{ id: 'criterion-1', statement: 'It works' }],
          deliverables: [{ id: 'deliverable-1', name: 'API' }],
          privateInternalField: 'must not be serialized',
        },
        evidence: {
          requirements: [{ id: 'requirement-1', description: 'Integration report' }],
          verificationMethod: 'human_review',
          capabilities: [],
          profileEligibility: true,
          privacyClassification: 'internal',
        },
      },
    },
    workFieldProvenance: { secret: 'no' },
    acknowledgementBasis: { kind: 'fresh_assignment' },
    changeDecision: { changeClass: 'initial' },
  }
  return {
    schemaVersion: 'suar.task_completion_review_package.v1',
    reportId: 'report-1',
    taskId: 'task-1',
    taskAssignmentId: 'assignment-1',
    reportRevision: 2,
    completionReportHash: HASH,
    assignmentContract,
    reportCanonicalPayload: {
      report: {
        id: 'report-1',
        workPerformed: 'Implemented the API lifecycle',
        contributionStatement: 'Owned the implementation',
        actualRole: 'engineer',
        actualOwnership: 'primary_owner',
        actualAutonomy: 'independent',
        actualDeliverableIds: ['deliverable-1'],
        actualOutcomes: { tests: 'passed' },
        impactObserved: { users: 'unblocked' },
        limitations: null,
        remainingWork: null,
      },
      requestHash: HASH,
    },
    criterionResults: [
      {
        id: 'criterion-result-1',
        completion_report_id: 'report-1',
        criterion_id: 'criterion-1',
        expected_outcome: 'It works',
        actual_outcome: 'It works',
        result: 'met',
        explanation: 'Integration passed',
        validation_outcomes: [],
      },
    ],
    evidenceManifest: [
      {
        id: 'evidence-1',
        completion_report_id: 'report-1',
        evidence_type: 'integration_report',
        title: 'Integration report',
        description: 'The report',
        uri: 'https://private.example.test/tokenized?secret=1',
        storage_reference: 'bucket/private-key',
        version_reference: 'build-1',
        content_hash: HASH,
        evidence_requirement_ids: ['requirement-1', 'requirement-2'],
        related_deliverable_ids: ['deliverable-1', 'deliverable-2'],
        access_classification: 'internal',
        reviewer_access_state: 'available',
        availability: 'available',
        retention_state: 'retained',
        tombstoned_at: null,
      },
    ],
    contributorClaims: [
      {
        id: 'claim-1',
        completion_report_id: 'report-1',
        contributor_user_id: 'user-1',
        action: 'implement',
        object: 'API lifecycle',
        proposed_title: 'API lifecycle',
        proposed_statement: 'Implemented the lifecycle',
        actual_role: 'engineer',
        actual_ownership: 'primary_owner',
        contribution_statement: 'Owned implementation',
        deliverable_refs: ['deliverable-1'],
        criterion_result_refs: ['criterion-result-1'],
        evidence_refs: ['evidence-1'],
        outcome_data: { tests: 'passed' },
        privacy_classification: 'internal',
        claim_status: 'under_review',
      },
    ],
    evidenceMappings: [
      {
        id: 'mapping-1',
        completion_report_id: 'report-1',
        evidence_item_id: 'evidence-1',
        criterion_result_id: 'criterion-result-1',
        contributor_claim_id: null,
        mapping_purpose: 'completion_proof',
        attribution_statement: null,
      },
    ],
    packageHash: HASH,
  }
}

test.group('Task Completion Review Package response mapper', () => {
  test('returns an explicit reviewer allowlist without raw persistence or locator fields', ({
    assert,
  }) => {
    const response = mapTaskCompletionReviewPackageResponse(packageFixture())
    const serialized = JSON.stringify(response)

    assert.equal(response.schemaVersion, 'suar.task_completion_review_package_editor.v1')
    assert.equal(response.report.id, 'report-1')
    assert.equal(response.criterionResults[0]?.criterionId, 'criterion-1')
    assert.equal(response.evidenceManifest[0]?.evidenceId, 'evidence-1')
    assert.equal(response.evidenceManifest[0]?.reviewerAccessState, 'available')
    assert.deepEqual(response.evidenceManifest[0]?.evidenceRequirementIds, [
      'requirement-1',
      'requirement-2',
    ])
    assert.deepEqual(response.evidenceManifest[0]?.deliverableIds, [
      'deliverable-1',
      'deliverable-2',
    ])
    assert.notProperty(response, 'reportCanonicalPayload')
    assert.notProperty(response.assignmentContract, 'workFieldProvenance')
    assert.notInclude(serialized, 'requestHash')
    assert.notInclude(serialized, 'privateInternalField')
    assert.notInclude(serialized, 'criterion_id')
    assert.notInclude(serialized, 'contributor_user_id')
    assert.notInclude(serialized, 'outcomeData')
    assert.notInclude(serialized, 'outcome_data')
    assert.notInclude(serialized, 'storage_reference')
    assert.notInclude(serialized, 'tokenized')
    assert.notInclude(serialized, 'retention_state')
    assert.notInclude(serialized, 'tombstoned_at')
  })
})
