import {
  addIfMissing,
  duplicateValues,
  hasForeign,
  hasJsonContent,
  meaningful,
  TASK_COMPLETION_REPORT_CODES,
  type CompletionCriterionResultInput,
  type CompletionEvidenceInput,
  type TaskCompletionReportCode,
  type TaskCompletionReportValidationInput,
  type TaskCompletionReportValidationResult,
} from './task_completion_report_types.js'

export {
  TASK_COMPLETION_REPORT_CODES,
  type CompletionContributorClaimInput,
  type CompletionCriterionResultInput,
  type CompletionEvidenceAccessProjection,
  type CompletionEvidenceInput,
  type CompletionReportInput,
  type TaskCompletionReportCode,
  type TaskCompletionReportValidationInput,
  type TaskCompletionReportValidationResult,
} from './task_completion_report_types.js'

/**
 * Validates facts supplied by a Completion Report against the immutable assignment snapshot.
 * This kernel deliberately does not infer that evidence was reviewed or that a candidate claim is
 * true; those are Review concerns. It only prevents unpinned, unscoped, or unverifiable data from
 * entering the submit-for-review path.
 */
export function validateTaskCompletionReport(
  input: TaskCompletionReportValidationInput
): TaskCompletionReportValidationResult {
  const { assignmentSnapshot: snapshot, report } = input
  const codes = new Set<TaskCompletionReportCode>()
  const expectedCriteria = new Map(
    snapshot.resolvedContract.work.acceptanceCriteria.map((criterion) => [criterion.id, criterion])
  )
  const expectedDeliverableIds = new Set(
    snapshot.resolvedContract.work.deliverables.map((deliverable) => deliverable.id)
  )
  const expectedRequirementIds = new Set(
    snapshot.resolvedContract.evidence.requirements.map((requirement) => requirement.id)
  )

  addIfMissing(
    codes,
    report.taskId !== snapshot.taskId,
    TASK_COMPLETION_REPORT_CODES.taskProvenanceMismatch
  )
  addIfMissing(
    codes,
    report.taskAssignmentId !== snapshot.assignmentId,
    TASK_COMPLETION_REPORT_CODES.assignmentProvenanceMismatch
  )
  addIfMissing(
    codes,
    report.assignmentSnapshotId !== snapshot.id,
    TASK_COMPLETION_REPORT_CODES.snapshotProvenanceMismatch
  )
  addIfMissing(
    codes,
    report.assignmentSnapshotHash !== snapshot.snapshotHash,
    TASK_COMPLETION_REPORT_CODES.snapshotHashMismatch
  )
  addIfMissing(
    codes,
    report.taskContractVersionId !== snapshot.provenance.taskContractVersionId,
    TASK_COMPLETION_REPORT_CODES.contractProvenanceMismatch
  )
  addIfMissing(
    codes,
    report.reportedBy !== snapshot.assigneeId,
    TASK_COMPLETION_REPORT_CODES.reporterNotAssignee
  )

  addIfMissing(
    codes,
    !meaningful(report.workPerformed),
    TASK_COMPLETION_REPORT_CODES.workPerformedRequired
  )
  addIfMissing(
    codes,
    !meaningful(report.contributionStatement),
    TASK_COMPLETION_REPORT_CODES.contributionRequired
  )
  addIfMissing(
    codes,
    !meaningful(report.actualRole),
    TASK_COMPLETION_REPORT_CODES.actualRoleRequired
  )
  addIfMissing(
    codes,
    report.actualOwnership === null,
    TASK_COMPLETION_REPORT_CODES.actualOwnershipRequired
  )
  addIfMissing(
    codes,
    hasForeign(report.actualDeliverableIds, expectedDeliverableIds),
    TASK_COMPLETION_REPORT_CODES.deliverableForeign
  )
  for (const deliverableId of expectedDeliverableIds) {
    addIfMissing(
      codes,
      !report.actualDeliverableIds.includes(deliverableId),
      TASK_COMPLETION_REPORT_CODES.deliverableMissing
    )
  }
  addIfMissing(
    codes,
    !hasJsonContent(report.actualOutcomes),
    TASK_COMPLETION_REPORT_CODES.actualOutcomesRequired
  )
  addIfMissing(
    codes,
    !hasJsonContent(report.impactObserved),
    TASK_COMPLETION_REPORT_CODES.impactObservedRequired
  )

  const criterionResultsByCriterion = new Map<string, CompletionCriterionResultInput[]>()
  const criterionResultIds = report.criterionResults.map((result) => result.id)
  addIfMissing(
    codes,
    duplicateValues(criterionResultIds).size > 0,
    TASK_COMPLETION_REPORT_CODES.criterionResultDuplicate
  )
  for (const result of report.criterionResults) {
    const expected = expectedCriteria.get(result.criterionId)
    if (!expected) {
      codes.add(TASK_COMPLETION_REPORT_CODES.criterionForeign)
      continue
    }
    const existing = criterionResultsByCriterion.get(result.criterionId) ?? []
    existing.push(result)
    criterionResultsByCriterion.set(result.criterionId, existing)
    addIfMissing(
      codes,
      result.expectedOutcome !== expected.statement,
      TASK_COMPLETION_REPORT_CODES.criterionExpectedMismatch
    )
    addIfMissing(
      codes,
      !meaningful(result.actualOutcome),
      TASK_COMPLETION_REPORT_CODES.criterionActualRequired
    )
    addIfMissing(
      codes,
      !meaningful(result.explanation),
      TASK_COMPLETION_REPORT_CODES.criterionExplanationRequired
    )
    if (result.result === 'not_applicable') {
      addIfMissing(
        codes,
        !meaningful(result.notApplicableReason),
        TASK_COMPLETION_REPORT_CODES.notApplicableReasonRequired
      )
      addIfMissing(
        codes,
        !meaningful(result.notApplicablePolicyRef),
        TASK_COMPLETION_REPORT_CODES.notApplicablePolicyRequired
      )
    }
    if (result.deviationStatus !== 'none') {
      addIfMissing(
        codes,
        !meaningful(result.deviationSummary),
        TASK_COMPLETION_REPORT_CODES.deviationSummaryRequired
      )
      if (
        result.deviationStatus === 'approved' ||
        result.deviationStatus === 'governed_exception'
      ) {
        addIfMissing(
          codes,
          !meaningful(result.deviationApprovalRef),
          TASK_COMPLETION_REPORT_CODES.deviationApprovalRequired
        )
      }
    }
  }
  for (const criterionId of expectedCriteria.keys()) {
    const results = criterionResultsByCriterion.get(criterionId) ?? []
    addIfMissing(codes, results.length === 0, TASK_COMPLETION_REPORT_CODES.criterionMissing)
    addIfMissing(codes, results.length > 1, TASK_COMPLETION_REPORT_CODES.criterionDuplicate)
  }

  const evidenceById = new Map<string, CompletionEvidenceInput>()
  const evidenceIds = report.evidence.map((evidence) => evidence.id)
  addIfMissing(
    codes,
    duplicateValues(evidenceIds).size > 0,
    TASK_COMPLETION_REPORT_CODES.evidenceDuplicate
  )
  for (const evidence of report.evidence) {
    evidenceById.set(evidence.id, evidence)
    addIfMissing(
      codes,
      hasForeign(evidence.evidenceRequirementIds, expectedRequirementIds),
      TASK_COMPLETION_REPORT_CODES.evidenceRequirementForeign
    )
    addIfMissing(
      codes,
      hasForeign(evidence.criterionIds, new Set(expectedCriteria.keys())),
      TASK_COMPLETION_REPORT_CODES.evidenceCriterionForeign
    )
    addIfMissing(
      codes,
      hasForeign(evidence.deliverableIds, expectedDeliverableIds),
      TASK_COMPLETION_REPORT_CODES.evidenceDeliverableForeign
    )
    addIfMissing(
      codes,
      evidence.availability !== 'available',
      TASK_COMPLETION_REPORT_CODES.evidenceUnavailable
    )
    addIfMissing(
      codes,
      evidence.reviewerAccessState !== 'available',
      TASK_COMPLETION_REPORT_CODES.reviewerAccessUnavailable
    )
    for (const requirementId of evidence.evidenceRequirementIds) {
      const requirement = snapshot.resolvedContract.evidence.requirements.find(
        (candidate) => candidate.id === requirementId
      )
      if (!requirement) continue
      const mapsExpectedCriterion = requirement.criterionIds.some((criterionId) =>
        evidence.criterionIds.includes(criterionId)
      )
      const mapsExpectedDeliverable = requirement.deliverableIds.some((deliverableId) =>
        evidence.deliverableIds.includes(deliverableId)
      )
      addIfMissing(
        codes,
        (requirement.criterionIds.length > 0 || requirement.deliverableIds.length > 0) &&
          !mapsExpectedCriterion &&
          !mapsExpectedDeliverable,
        TASK_COMPLETION_REPORT_CODES.evidenceRequirementMappingMissing
      )
    }
  }
  for (const requirement of snapshot.resolvedContract.evidence.requirements) {
    if (!requirement.required) continue
    addIfMissing(
      codes,
      !report.evidence.some((evidence) =>
        evidence.evidenceRequirementIds.includes(requirement.id)
      ),
      TASK_COMPLETION_REPORT_CODES.requiredEvidenceMissing
    )
  }

  for (const result of report.criterionResults) {
    if (!expectedCriteria.has(result.criterionId) || result.result === 'not_applicable')
      continue
    const mappedEvidence = result.evidenceIds
      .map((evidenceId) => evidenceById.get(evidenceId))
      .filter((evidence): evidence is CompletionEvidenceInput => evidence !== undefined)
      .filter((evidence) => evidence.criterionIds.includes(result.criterionId))
    addIfMissing(
      codes,
      mappedEvidence.length === 0,
      TASK_COMPLETION_REPORT_CODES.criterionEvidenceMissing
    )
  }

  const validCriterionResultIds = new Set(
    report.criterionResults
      .filter((result) => expectedCriteria.has(result.criterionId))
      .map((result) => result.id)
  )
  const claimIds = report.contributorClaims.map((claim) => claim.id)
  const contributorIds = report.contributorClaims.map((claim) => claim.contributorUserId)
  addIfMissing(
    codes,
    duplicateValues(claimIds).size > 0,
    TASK_COMPLETION_REPORT_CODES.claimDuplicate
  )
  addIfMissing(
    codes,
    duplicateValues(contributorIds).size > 0,
    TASK_COMPLETION_REPORT_CODES.contributorClaimDuplicate
  )
  addIfMissing(
    codes,
    !report.contributorClaims.some((claim) => claim.contributorUserId === report.reportedBy),
    TASK_COMPLETION_REPORT_CODES.claimMissing
  )
  for (const claim of report.contributorClaims) {
    addIfMissing(
      codes,
      claim.action !== snapshot.resolvedContract.work.action,
      TASK_COMPLETION_REPORT_CODES.claimActionOutsideContract
    )
    addIfMissing(
      codes,
      claim.object !== snapshot.resolvedContract.work.object,
      TASK_COMPLETION_REPORT_CODES.claimObjectOutsideContract
    )
    addIfMissing(
      codes,
      !meaningful(claim.contributionStatement) ||
        !meaningful(claim.actualRole) ||
        claim.actualOwnership === null,
      TASK_COMPLETION_REPORT_CODES.claimContributionRequired
    )
    addIfMissing(
      codes,
      claim.deliverableIds.length === 0 ||
        claim.criterionResultIds.length === 0 ||
        claim.evidenceIds.length === 0,
      TASK_COMPLETION_REPORT_CODES.claimScopeRequired
    )
    addIfMissing(
      codes,
      hasForeign(claim.deliverableIds, expectedDeliverableIds),
      TASK_COMPLETION_REPORT_CODES.claimDeliverableForeign
    )
    addIfMissing(
      codes,
      hasForeign(claim.criterionResultIds, validCriterionResultIds),
      TASK_COMPLETION_REPORT_CODES.claimCriterionResultForeign
    )
    addIfMissing(
      codes,
      hasForeign(claim.evidenceIds, new Set(evidenceById.keys())),
      TASK_COMPLETION_REPORT_CODES.claimEvidenceForeign
    )
    const attributedEvidence = claim.evidenceIds
      .map((evidenceId) => evidenceById.get(evidenceId))
      .filter((evidence): evidence is CompletionEvidenceInput => evidence !== undefined)
      .some(
        (evidence) =>
          evidence.ownerUserId === claim.contributorUserId ||
          evidence.contributorUserIds.includes(claim.contributorUserId)
      )
    addIfMissing(
      codes,
      claim.evidenceIds.length > 0 && !attributedEvidence,
      TASK_COMPLETION_REPORT_CODES.claimEvidenceAttributionMissing
    )
  }

  const blockerCodes = [...codes].sort()
  const evidenceAccess = report.evidence.map((evidence) => ({
    evidenceId: evidence.id,
    privacyClassification: evidence.privacyClassification,
    reviewerAccessState: evidence.reviewerAccessState,
    reviewerHasAccess: evidence.reviewerAccessState === 'available',
  }))
  const canSubmit = blockerCodes.length === 0

  return {
    allowed: input.intent === 'save_draft' || canSubmit,
    action:
      input.intent === 'save_draft'
        ? 'save_draft'
        : canSubmit
          ? 'submit_for_review'
          : 'reject',
    blockerCodes,
    evidenceAccess,
  }
}
