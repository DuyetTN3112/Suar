import { describe, expect, it } from 'vitest'

import {
  normalizeTaskCompletionReviewPackage,
  projectReviewPackageToObservationContext,
} from '@/apps/shared/reviews/task_completion_review_package'

const HASH = `sha256:${'a'.repeat(64)}`

function packageResponse() {
  return {
    schemaVersion: 'suar.task_completion_review_package_editor.v1',
    reportId: 'report-1',
    taskId: 'task-1',
    taskAssignmentId: 'assignment-1',
    reportRevision: 2,
    completionReportHash: HASH,
    assignmentContract: {
      snapshot: {
        id: 'snapshot-1',
        assignmentId: 'assignment-1',
        taskId: 'task-1',
        snapshotHash: HASH,
        resolvedContract: {
          versionId: 'contract-1',
          title: 'Implement API lifecycle',
          work: {
            action: 'implement',
            object: 'API lifecycle',
            deliverables: [{ id: 'deliverable-1', name: 'API' }],
            acceptanceCriteria: [{ id: 'criterion-1', statement: 'It works' }],
          },
          evidence: {
            requirements: [{ id: 'requirement-1', title: 'Integration report' }],
            verificationMethod: 'human_review',
            privacyClassification: 'internal',
          },
        },
      },
    },
    report: {
      id: 'report-1',
      workPerformed: 'Implemented the API lifecycle',
      contributionStatement: 'Owned implementation',
      actualOwnership: 'primary_owner',
      actualAutonomy: 'independent',
    },
    criterionResults: [
      {
        id: 'criterion-result-1',
        criterionId: 'criterion-1',
        expectedOutcome: 'It works',
        actualOutcome: 'It works',
        result: 'met',
        explanation: 'Integration passed',
      },
    ],
    evidenceManifest: [
      {
        evidenceId: 'evidence-1',
        evidenceType: 'integration_report',
        title: 'Integration report',
        accessClassification: 'internal',
        reviewerAccessState: 'available',
        availability: 'available',
      },
    ],
    contributorClaims: [
      {
        id: 'claim-1',
        contributorUserId: 'worker-1',
        action: 'implement',
        object: 'API lifecycle',
        proposedTitle: 'API lifecycle',
        proposedStatement: 'Implemented the lifecycle',
        actualOwnership: 'primary_owner',
        deliverableRefs: ['deliverable-1'],
        criterionResultRefs: ['criterion-result-1'],
        evidenceRefs: ['evidence-1'],
        outcomeData: { uri: 's3://private-locator', secret: 'not-for-reviewer-ui' },
        privacyClassification: 'internal',
        claimStatus: 'under_review',
      },
    ],
    evidenceMappings: [
      {
        id: 'mapping-1',
        evidenceItemId: 'evidence-1',
        criterionResultId: 'criterion-result-1',
        contributorClaimId: 'claim-1',
        mappingPurpose: 'completion_proof',
      },
    ],
    packageHash: HASH,
  }
}

describe('task completion review package frontend boundary', () => {
  it('normalizes the safe package and projects package facts into observation context', () => {
    const normalized = normalizeTaskCompletionReviewPackage(packageResponse(), {
      reportId: 'report-1',
      taskId: 'task-1',
      taskAssignmentId: 'assignment-1',
    })

    expect(normalized).not.toBeNull()
    expect(normalized?.assignmentContract.snapshot.id).toBe('snapshot-1')
    expect(normalized?.criterionResults[0]?.result).toBe('met')
    expect(normalized?.evidenceManifest[0]?.reviewerAccessState).toBe('available')

    if (!normalized) throw new Error('Expected a valid normalized review package')

    const context = projectReviewPackageToObservationContext(
      { reviewSessionId: 'session-1', reviewerTypes: [] },
      normalized
    )

    expect(context.claims[0]).toMatchObject({
      id: 'claim-1',
      evidence_refs: ['evidence-1'],
      claim_status: 'under_review',
    })
    expect(context.evidence[0]).toMatchObject({
      id: 'evidence-1',
      reviewer_access_state: 'available',
    })
    expect(context.reviewPackage.criterionResults[0]?.criterionId).toBe('criterion-1')
    expect(JSON.stringify(context)).not.toContain('uri')
  })

  it('fails closed for malformed or mismatched package identities', () => {
    expect(
      normalizeTaskCompletionReviewPackage(
        { ...packageResponse(), reportId: 'other-report' },
        { reportId: 'report-1', taskId: 'task-1', taskAssignmentId: 'assignment-1' }
      )
    ).toBeNull()
    expect(
      normalizeTaskCompletionReviewPackage(
        { ...packageResponse(), criterionResults: [{ id: 'criterion-result-1' }] },
        { reportId: 'report-1', taskId: 'task-1', taskAssignmentId: 'assignment-1' }
      )
    ).toBeNull()
  })
})
