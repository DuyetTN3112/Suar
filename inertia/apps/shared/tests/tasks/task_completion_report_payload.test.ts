import { describe, expect, it } from 'vitest'

import {
  buildTaskCompletionReportPayload,
  mergeExistingContributorClaims,
} from '../../tasks/task_completion_report_payload'

const context = {
  taskId: 'task-1',
  taskAssignmentId: 'assignment-1',
  taskSubmissionId: 'submission-1',
  assignmentSnapshotId: 'snapshot-1',
  assignmentSnapshotHash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  taskContractVersionId: 'contract-1',
  reportedBy: 'user-1',
  action: 'design',
  object: 'pre-order API',
  deliverableIds: ['deliverable-1'],
  criteria: [{ id: 'criterion-1', statement: 'The API handles retries.' }],
}

describe('buildTaskCompletionReportPayload', () => {
  it('maps structured criterion, evidence, manifest, and contributor ownership without widening scope', () => {
    const payload = buildTaskCompletionReportPayload({
      context,
      reportId: 'report-1',
      expectedRevision: 2,
      idempotencyKey: 'completion:attempt-2',
      actualRole: 'API designer',
      actualOwnership: 'primary_owner',
      actualAutonomy: 'independent',
      actualDeliverableIds: ['deliverable-1'],
      workPerformed: 'Implemented the retry-safe API flow.',
      contributionStatement: 'Owned the API design and implementation.',
      actualOutcomes: 'Integration tests pass.',
      impactObserved: 'Retries no longer duplicate orders.',
      criterionResults: {
        'criterion-1': {
          id: 'criterion-1-result',
          actualOutcome: 'Retry requests are idempotent.',
          explanation: 'The integration suite covers duplicate requests.',
          result: 'met',
          evidenceIds: ['evidence-1'],
        },
      },
      evidence: [
        {
          id: 'evidence-1',
          evidenceType: 'test_report',
          title: 'Integration report',
          description: 'Retry coverage',
          uri: 'https://example.test/report',
          evidenceRequirementIds: ['requirement-1'],
          criterionIds: ['criterion-1'],
          deliverableIds: ['deliverable-1'],
          ownerUserId: 'user-2',
          contributorUserIds: ['user-1', 'user-2'],
          reviewerAccessState: 'available',
          availability: 'available',
          privacyClassification: 'internal',
        },
      ],
      evidenceRequirements: [
        {
          id: 'requirement-1',
          criterionIds: ['criterion-1'],
          deliverableIds: ['deliverable-1'],
        },
      ],
      contributorClaims: [
        {
          id: 'claim-1',
          contributorUserId: 'user-1',
          actualRole: 'API designer',
          actualOwnership: 'primary_owner',
          contributionStatement: 'Owned the API design and implementation.',
          deliverableIds: ['deliverable-1'],
          criterionResultIds: ['criterion-1-result'],
          evidenceIds: ['evidence-1'],
        },
      ],
    })

    expect(payload).toEqual({
      taskSubmissionId: 'submission-1',
      expectedRevision: 2,
      idempotencyKey: 'completion:attempt-2',
      report: {
        id: 'report-1',
        taskId: 'task-1',
        taskAssignmentId: 'assignment-1',
        assignmentSnapshotId: 'snapshot-1',
        assignmentSnapshotHash: context.assignmentSnapshotHash,
        taskContractVersionId: 'contract-1',
        reportedBy: 'user-1',
        workPerformed: 'Implemented the retry-safe API flow.',
        contributionStatement: 'Owned the API design and implementation.',
        actualRole: 'API designer',
        actualOwnership: 'primary_owner',
        actualAutonomy: 'independent',
        actualDeliverableIds: ['deliverable-1'],
        actualOutcomes: { summary: 'Integration tests pass.' },
        impactObserved: { summary: 'Retries no longer duplicate orders.' },
        limitations: null,
        remainingWork: null,
        criterionResults: [
          {
            id: 'criterion-1-result',
            criterionId: 'criterion-1',
            expectedOutcome: 'The API handles retries.',
            actualOutcome: 'Retry requests are idempotent.',
            result: 'met',
            explanation: 'The integration suite covers duplicate requests.',
            evidenceIds: ['evidence-1'],
            deviationStatus: 'none',
            deviationSummary: null,
            deviationApprovalRef: null,
            notApplicableReason: null,
            notApplicablePolicyRef: null,
          },
        ],
        evidence: [
          {
            id: 'evidence-1',
            evidenceRequirementIds: ['requirement-1'],
            criterionIds: ['criterion-1'],
            deliverableIds: ['deliverable-1'],
            ownerUserId: 'user-2',
            contributorUserIds: ['user-1', 'user-2'],
            reviewerAccessState: 'available',
            availability: 'available',
            privacyClassification: 'internal',
          },
        ],
        contributorClaims: [
          {
            id: 'claim-1',
            contributorUserId: 'user-1',
            action: 'design',
            object: 'pre-order API',
            actualRole: 'API designer',
            actualOwnership: 'primary_owner',
            contributionStatement: 'Owned the API design and implementation.',
            deliverableIds: ['deliverable-1'],
            criterionResultIds: ['criterion-1-result'],
            evidenceIds: ['evidence-1'],
          },
        ],
      },
      evidenceManifest: [
        {
          evidenceId: 'evidence-1',
          evidenceType: 'test_report',
          title: 'Integration report',
          description: 'Retry coverage',
          uri: 'https://example.test/report',
          storageReference: null,
          versionReference: null,
          contentHash: null,
          capturedAt: null,
        },
      ],
    })

    expect(payload.report.criterionResults[0]?.evidenceIds).toEqual(['evidence-1'])
    expect(payload.report.contributorClaims[0]?.evidenceIds).toEqual(['evidence-1'])
  })

  it('replaces only the current reporter claim while preserving other contributor claims', () => {
    const existing = [
      {
        id: 'claim-current-old',
        contributorUserId: 'user-1',
        actualRole: 'Old role',
        actualOwnership: 'contributor' as const,
        contributionStatement: 'Old statement',
        deliverableIds: ['deliverable-1'],
        criterionResultIds: ['criterion-result-1'],
        evidenceIds: ['evidence-1'],
      },
      {
        id: 'claim-other',
        contributorUserId: 'user-2',
        actualRole: 'Reviewer',
        actualOwnership: 'shared_owner' as const,
        contributionStatement: 'Owned the integration work.',
        deliverableIds: ['deliverable-1'],
        criterionResultIds: ['criterion-result-1'],
        evidenceIds: ['evidence-1'],
      },
    ]
    const current = { ...existing[0], id: 'claim-current-new', actualRole: 'API designer' }

    expect(mergeExistingContributorClaims(existing, current, 'user-1')).toEqual([
      current,
      existing[1],
    ])
  })

  it('keeps incomplete drafts representable without inventing actual outcomes or evidence', () => {
    const payload = buildTaskCompletionReportPayload({
      context,
      reportId: 'report-2',
      expectedRevision: 0,
      idempotencyKey: 'completion:draft-1',
      actualRole: '',
      actualOwnership: null,
      actualAutonomy: null,
      actualDeliverableIds: [],
      workPerformed: '',
      contributionStatement: '',
      actualOutcomes: '',
      impactObserved: '',
      criterionResults: {},
      evidence: [],
      evidenceRequirements: [],
      contributorClaims: [],
    })

    expect(payload.report.actualOutcomes).toEqual({})
    expect(payload.report.impactObserved).toEqual({})
    expect(payload.report.criterionResults).toEqual([])
    expect(payload.report.evidence).toEqual([])
    expect(payload.report.contributorClaims).toEqual([])
    expect(payload.evidenceManifest).toEqual([])
  })

  it('rejects evidence mappings outside the pinned contract before sending a request', () => {
    expect(() =>
      buildTaskCompletionReportPayload({
        context,
        reportId: 'report-3',
        expectedRevision: 0,
        idempotencyKey: 'completion:foreign-evidence',
        actualRole: '',
        actualOwnership: null,
        actualAutonomy: null,
        actualDeliverableIds: [],
        workPerformed: '',
        contributionStatement: '',
        actualOutcomes: '',
        impactObserved: '',
        criterionResults: {},
        evidence: [
          {
            id: 'evidence-foreign',
            evidenceType: 'document',
            title: 'Foreign evidence',
            uri: 'https://example.test/foreign',
            evidenceRequirementIds: ['requirement-foreign'],
            criterionIds: ['criterion-foreign'],
            deliverableIds: ['deliverable-foreign'],
            reviewerAccessState: 'unknown',
            availability: 'not_disclosed',
            privacyClassification: 'internal',
          },
        ],
        evidenceRequirements: [
          {
            id: 'requirement-1',
            criterionIds: ['criterion-1'],
            deliverableIds: ['deliverable-1'],
          },
        ],
        contributorClaims: [],
      })
    ).toThrow('outside the pinned assignment contract')
  })

  it('preserves explicit N/A and deviation decisions instead of inventing them', () => {
    const payload = buildTaskCompletionReportPayload({
      context,
      reportId: 'report-4',
      expectedRevision: 0,
      idempotencyKey: 'completion:criterion-exception',
      actualRole: 'API designer',
      actualOwnership: 'primary_owner',
      actualAutonomy: 'independent',
      actualDeliverableIds: [],
      workPerformed: 'Implemented the retry-safe API flow.',
      contributionStatement: 'Owned the API design and implementation.',
      actualOutcomes: 'The endpoint is available.',
      impactObserved: 'Duplicate requests are safe.',
      criterionResults: {
        'criterion-1': {
          id: 'criterion-1-result',
          actualOutcome: 'Covered by a governed exception.',
          explanation: 'The external dependency was unavailable during verification.',
          result: 'not_applicable',
          evidenceIds: [],
          deviationStatus: 'governed_exception',
          deviationSummary: 'External dependency unavailable.',
          deviationApprovalRef: 'approval-1',
          notApplicableReason: 'The criterion does not apply to this environment.',
          notApplicablePolicyRef: 'policy-1',
        },
      },
      evidence: [],
      evidenceRequirements: [],
      contributorClaims: [],
    })

    expect(payload.report.criterionResults[0]).toMatchObject({
      result: 'not_applicable',
      deviationStatus: 'governed_exception',
      deviationSummary: 'External dependency unavailable.',
      deviationApprovalRef: 'approval-1',
      notApplicableReason: 'The criterion does not apply to this environment.',
      notApplicablePolicyRef: 'policy-1',
    })
  })

  it('uses the backend autonomy vocabulary in the native report payload', () => {
    const payload = buildTaskCompletionReportPayload({
      context,
      reportId: 'report-5',
      expectedRevision: 0,
      idempotencyKey: 'completion:supervised',
      actualRole: 'API designer',
      actualOwnership: 'primary_owner',
      actualAutonomy: 'supervised',
      actualDeliverableIds: [],
      workPerformed: 'Reviewed the implementation.',
      contributionStatement: 'Reviewed the API implementation.',
      actualOutcomes: 'The API remains stable.',
      impactObserved: 'No regression observed.',
      criterionResults: {},
      evidence: [],
      evidenceRequirements: [],
      contributorClaims: [],
    })

    expect(payload.report.actualAutonomy).toBe('supervised')
  })
})
