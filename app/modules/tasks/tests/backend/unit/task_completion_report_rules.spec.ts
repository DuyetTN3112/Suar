import { test } from '@japa/runner'

import {
  TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import {
  TASK_COMPLETION_REPORT_CODES,
  validateTaskCompletionReport,
  type TaskCompletionReportValidationInput,
} from '#modules/tasks/domain/task-submissions/task_completion_report_rules'

const snapshot = TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE

function first<T>(values: readonly T[]): T {
  const value = values[0]
  if (value === undefined) throw new Error('Test fixture must contain at least one value')
  return value
}

const expectedCriterion = first(snapshot.resolvedContract.work.acceptanceCriteria)
const criterionId = expectedCriterion.id
const deliverableId = first(snapshot.resolvedContract.work.deliverables).id
const evidenceRequirementId = first(snapshot.resolvedContract.evidence.requirements).id

const ids = {
  report: '30000000-0000-4000-8000-000000000001',
  criterionResult: '30000000-0000-4000-8000-000000000002',
  evidence: '30000000-0000-4000-8000-000000000003',
  claim: '30000000-0000-4000-8000-000000000004',
  contributor: '30000000-0000-4000-8000-000000000005',
} as const

function validInput(
  overrides: Partial<TaskCompletionReportValidationInput> = {}
): TaskCompletionReportValidationInput {
  return {
    intent: 'submit_for_review',
    assignmentSnapshot: snapshot,
    report: {
      id: ids.report,
      taskId: snapshot.taskId,
      taskAssignmentId: snapshot.assignmentId,
      assignmentSnapshotId: snapshot.id,
      assignmentSnapshotHash: snapshot.snapshotHash,
      taskContractVersionId: snapshot.provenance.taskContractVersionId,
      reportedBy: snapshot.assigneeId,
      workPerformed: 'Designed the API lifecycle and implemented idempotent command handling.',
      contributionStatement: 'Owned the API design, implementation, and integration verification.',
      actualRole: snapshot.roleInTask,
      actualOwnership: snapshot.ownershipLevel,
      actualAutonomy: 'independent',
      actualDeliverableIds: [deliverableId],
      actualOutcomes: { integrationSuite: 'passed', criteriaMet: 1 },
      impactObserved: { observed: 'Pre-order lifecycle is verified in staging.' },
      limitations: null,
      remainingWork: null,
      criterionResults: [
        {
          id: ids.criterionResult,
          criterionId,
          expectedOutcome: expectedCriterion.statement,
          actualOutcome: 'Lifecycle, error, and idempotency flows passed the integration suite.',
          result: 'met',
          explanation: 'Observed through the linked integration report.',
          evidenceIds: [ids.evidence],
          deviationStatus: 'none',
          deviationSummary: null,
          deviationApprovalRef: null,
          notApplicableReason: null,
          notApplicablePolicyRef: null,
        },
      ],
      evidence: [
        {
          id: ids.evidence,
          evidenceRequirementIds: [evidenceRequirementId],
          criterionIds: [criterionId],
          deliverableIds: [deliverableId],
          ownerUserId: snapshot.assigneeId,
          contributorUserIds: [snapshot.assigneeId],
          reviewerAccessState: 'available',
          availability: 'available',
          privacyClassification: 'internal',
        },
      ],
      contributorClaims: [
        {
          id: ids.claim,
          contributorUserId: snapshot.assigneeId,
          action: snapshot.resolvedContract.work.action,
          object: snapshot.resolvedContract.work.object,
          actualRole: snapshot.roleInTask,
          actualOwnership: snapshot.ownershipLevel,
          contributionStatement: 'Owned the implementation and verification scope described above.',
          deliverableIds: [deliverableId],
          criterionResultIds: [ids.criterionResult],
          evidenceIds: [ids.evidence],
        },
      ],
    },
    ...overrides,
  }
}

test.group('Task Completion Report rules', () => {
  test('accepts a complete report only when it is pinned to the exact assignment Contract', ({
    assert,
  }) => {
    const result = validateTaskCompletionReport(validInput())

    assert.isTrue(result.allowed)
    assert.equal(result.action, 'submit_for_review')
    assert.deepEqual(result.blockerCodes, [])
  })

  test('allows an incomplete Draft but rejects the identical data at submit time', ({ assert }) => {
    const incomplete = validInput({
      intent: 'save_draft',
      report: {
        ...validInput().report,
        workPerformed: ' ',
        actualOutcomes: {},
        impactObserved: {},
        criterionResults: [],
        evidence: [],
        contributorClaims: [],
      },
    })

    const draft = validateTaskCompletionReport(incomplete)
    const submit = validateTaskCompletionReport({ ...incomplete, intent: 'submit_for_review' })

    assert.isTrue(draft.allowed)
    assert.equal(draft.action, 'save_draft')
    assert.include(draft.blockerCodes, TASK_COMPLETION_REPORT_CODES.workPerformedRequired)
    assert.include(draft.blockerCodes, TASK_COMPLETION_REPORT_CODES.actualOutcomesRequired)
    assert.include(draft.blockerCodes, TASK_COMPLETION_REPORT_CODES.impactObservedRequired)
    assert.include(draft.blockerCodes, TASK_COMPLETION_REPORT_CODES.criterionMissing)
    assert.isFalse(submit.allowed)
    assert.equal(submit.action, 'reject')
    assert.deepEqual(submit.blockerCodes, draft.blockerCodes)
  })

  test('rejects every foreign assignment/task/snapshot/contract provenance reference', ({ assert }) => {
    const base = validInput()
    const report = {
      ...base.report,
      taskId: 'foreign-task',
      taskAssignmentId: 'foreign-assignment',
      assignmentSnapshotId: 'foreign-snapshot',
      assignmentSnapshotHash: `sha256:${'f'.repeat(64)}` as const,
      taskContractVersionId: 'foreign-contract',
      reportedBy: ids.contributor,
    }

    const result = validateTaskCompletionReport({ ...base, report })

    assert.isFalse(result.allowed)
    for (const code of [
      TASK_COMPLETION_REPORT_CODES.taskProvenanceMismatch,
      TASK_COMPLETION_REPORT_CODES.assignmentProvenanceMismatch,
      TASK_COMPLETION_REPORT_CODES.snapshotProvenanceMismatch,
      TASK_COMPLETION_REPORT_CODES.snapshotHashMismatch,
      TASK_COMPLETION_REPORT_CODES.contractProvenanceMismatch,
      TASK_COMPLETION_REPORT_CODES.reporterNotAssignee,
    ]) {
      assert.include(result.blockerCodes, code)
    }
  })

  test('requires one valid actual result per expected criterion and governed N/A/deviation data', ({
    assert,
  }) => {
    const base = validInput()
    const invalidResult = {
      ...first(base.report.criterionResults),
      result: 'not_applicable' as const,
      evidenceIds: [],
      deviationStatus: 'reported' as const,
      deviationSummary: null,
      deviationApprovalRef: null,
      notApplicableReason: null,
      notApplicablePolicyRef: null,
    }
    const foreignResult = { ...invalidResult, id: 'foreign-result', criterionId: 'foreign-criterion' }
    const result = validateTaskCompletionReport({
      ...base,
      report: { ...base.report, criterionResults: [invalidResult, invalidResult, foreignResult] },
    })

    assert.isFalse(result.allowed)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.criterionForeign)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.criterionResultDuplicate)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.criterionDuplicate)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.notApplicableReasonRequired)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.notApplicablePolicyRequired)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.deviationSummaryRequired)
  })

  test('requires required Evidence Contract coverage and criterion mapping at submit time', ({ assert }) => {
    const base = validInput()
    const result = validateTaskCompletionReport({
      ...base,
      report: {
        ...base.report,
        evidence: [{ ...first(base.report.evidence), evidenceRequirementIds: [], criterionIds: [] }],
      },
    })

    assert.isFalse(result.allowed)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.requiredEvidenceMissing)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.criterionEvidenceMissing)
  })

  test('does not accept an evidence item that labels a requirement but maps none of its expected proof', ({
    assert,
  }) => {
    const base = validInput()
    const result = validateTaskCompletionReport({
      ...base,
      report: {
        ...base.report,
        evidence: [
          { ...first(base.report.evidence), criterionIds: [], deliverableIds: [] },
        ],
      },
    })

    assert.isFalse(result.allowed)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.evidenceRequirementMappingMissing)
  })

  test('records confidential/restricted evidence honestly but blocks submit until reviewer access exists', ({
    assert,
  }) => {
    const base = validInput()
    const restricted = {
      ...first(base.report.evidence),
      privacyClassification: 'confidential' as const,
      reviewerAccessState: 'restricted' as const,
    }
    const result = validateTaskCompletionReport({
      ...base,
      report: { ...base.report, evidence: [restricted] },
    })

    assert.isFalse(result.allowed)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.reviewerAccessUnavailable)
    assert.equal(result.evidenceAccess[0]?.reviewerAccessState, 'restricted')
    assert.equal(result.evidenceAccess[0]?.reviewerHasAccess, false)
  })

  test('rejects duplicate IDs, foreign deliverable/evidence refs, and unsupported contributor claims', ({
    assert,
  }) => {
    const base = validInput()
    const malformedClaim = {
      ...first(base.report.contributorClaims),
      id: ids.claim,
      contributorUserId: ids.contributor,
      action: 'led_unrelated_database_migration',
      object: 'production_database',
      contributionStatement: ' ',
      deliverableIds: ['foreign-deliverable'],
      criterionResultIds: ['foreign-result'],
      evidenceIds: ['foreign-evidence'],
    }
    const duplicateEvidence = { ...first(base.report.evidence), id: ids.evidence }
    const result = validateTaskCompletionReport({
      ...base,
      report: {
        ...base.report,
        evidence: [first(base.report.evidence), duplicateEvidence],
        contributorClaims: [malformedClaim, malformedClaim],
      },
    })

    assert.isFalse(result.allowed)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.evidenceDuplicate)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.claimDuplicate)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.claimActionOutsideContract)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.claimObjectOutsideContract)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.claimContributionRequired)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.claimDeliverableForeign)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.claimCriterionResultForeign)
    assert.include(result.blockerCodes, TASK_COMPLETION_REPORT_CODES.claimEvidenceForeign)
  })
})
