import type {
  TvaAutonomyLevel,
  TvaCriterionResult,
  TvaJsonObject,
  TvaOwnershipLevel,
  TvaPrivacyClassification,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { TaskAssignmentSnapshotV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'

/**
 * Stable, transport-neutral validation codes. A Completion Report can be saved as a partial Draft,
 * but the exact same blockers reject submission for review.
 */
export const TASK_COMPLETION_REPORT_CODES = Object.freeze({
  taskProvenanceMismatch: 'TVA.COMPLETION.TASK_PROVENANCE_MISMATCH',
  assignmentProvenanceMismatch: 'TVA.COMPLETION.ASSIGNMENT_PROVENANCE_MISMATCH',
  snapshotProvenanceMismatch: 'TVA.COMPLETION.SNAPSHOT_PROVENANCE_MISMATCH',
  snapshotHashMismatch: 'TVA.COMPLETION.SNAPSHOT_HASH_MISMATCH',
  contractProvenanceMismatch: 'TVA.COMPLETION.CONTRACT_PROVENANCE_MISMATCH',
  reporterNotAssignee: 'TVA.COMPLETION.REPORTER_NOT_ASSIGNEE',
  assignmentAcknowledgementRequired: 'TVA.COMPLETION.ASSIGNMENT_ACKNOWLEDGEMENT_REQUIRED',
  assignmentClarificationUnresolved: 'TVA.COMPLETION.ASSIGNMENT_CLARIFICATION_UNRESOLVED',
  workPerformedRequired: 'TVA.COMPLETION.WORK_PERFORMED_REQUIRED',
  contributionRequired: 'TVA.COMPLETION.CONTRIBUTION_REQUIRED',
  actualRoleRequired: 'TVA.COMPLETION.ACTUAL_ROLE_REQUIRED',
  actualOwnershipRequired: 'TVA.COMPLETION.ACTUAL_OWNERSHIP_REQUIRED',
  actualOutcomesRequired: 'TVA.COMPLETION.ACTUAL_OUTCOMES_REQUIRED',
  impactObservedRequired: 'TVA.COMPLETION.IMPACT_OBSERVED_REQUIRED',
  deliverableMissing: 'TVA.COMPLETION.DELIVERABLE_MISSING',
  deliverableForeign: 'TVA.COMPLETION.DELIVERABLE_FOREIGN',
  criterionMissing: 'TVA.COMPLETION.CRITERION_MISSING',
  criterionDuplicate: 'TVA.COMPLETION.CRITERION_DUPLICATE',
  criterionResultDuplicate: 'TVA.COMPLETION.CRITERION_RESULT_ID_DUPLICATE',
  criterionForeign: 'TVA.COMPLETION.CRITERION_FOREIGN',
  criterionExpectedMismatch: 'TVA.COMPLETION.CRITERION_EXPECTED_MISMATCH',
  criterionActualRequired: 'TVA.COMPLETION.CRITERION_ACTUAL_REQUIRED',
  criterionExplanationRequired: 'TVA.COMPLETION.CRITERION_EXPLANATION_REQUIRED',
  criterionEvidenceMissing: 'TVA.COMPLETION.CRITERION_EVIDENCE_MISSING',
  notApplicableReasonRequired: 'TVA.COMPLETION.NOT_APPLICABLE_REASON_REQUIRED',
  notApplicablePolicyRequired: 'TVA.COMPLETION.NOT_APPLICABLE_POLICY_REQUIRED',
  deviationSummaryRequired: 'TVA.COMPLETION.DEVIATION_SUMMARY_REQUIRED',
  deviationApprovalRequired: 'TVA.COMPLETION.DEVIATION_APPROVAL_REQUIRED',
  requiredEvidenceMissing: 'TVA.COMPLETION.REQUIRED_EVIDENCE_MISSING',
  evidenceDuplicate: 'TVA.COMPLETION.EVIDENCE_ID_DUPLICATE',
  evidenceRequirementForeign: 'TVA.COMPLETION.EVIDENCE_REQUIREMENT_FOREIGN',
  evidenceCriterionForeign: 'TVA.COMPLETION.EVIDENCE_CRITERION_FOREIGN',
  evidenceDeliverableForeign: 'TVA.COMPLETION.EVIDENCE_DELIVERABLE_FOREIGN',
  evidenceRequirementMappingMissing: 'TVA.COMPLETION.EVIDENCE_REQUIREMENT_MAPPING_MISSING',
  evidenceUnavailable: 'TVA.COMPLETION.EVIDENCE_UNAVAILABLE',
  reviewerAccessUnavailable: 'TVA.COMPLETION.REVIEWER_ACCESS_UNAVAILABLE',
  claimMissing: 'TVA.COMPLETION.REPORTER_CLAIM_MISSING',
  claimDuplicate: 'TVA.COMPLETION.CLAIM_ID_DUPLICATE',
  contributorClaimDuplicate: 'TVA.COMPLETION.CONTRIBUTOR_CLAIM_DUPLICATE',
  claimActionOutsideContract: 'TVA.COMPLETION.CLAIM_ACTION_OUTSIDE_CONTRACT',
  claimObjectOutsideContract: 'TVA.COMPLETION.CLAIM_OBJECT_OUTSIDE_CONTRACT',
  claimContributionRequired: 'TVA.COMPLETION.CLAIM_CONTRIBUTION_REQUIRED',
  claimScopeRequired: 'TVA.COMPLETION.CLAIM_SCOPE_REQUIRED',
  claimDeliverableForeign: 'TVA.COMPLETION.CLAIM_DELIVERABLE_FOREIGN',
  claimCriterionResultForeign: 'TVA.COMPLETION.CLAIM_CRITERION_RESULT_FOREIGN',
  claimEvidenceForeign: 'TVA.COMPLETION.CLAIM_EVIDENCE_FOREIGN',
  claimEvidenceAttributionMissing: 'TVA.COMPLETION.CLAIM_EVIDENCE_ATTRIBUTION_MISSING',
} as const)

export type TaskCompletionReportCode =
  (typeof TASK_COMPLETION_REPORT_CODES)[keyof typeof TASK_COMPLETION_REPORT_CODES]

export interface CompletionCriterionResultInput {
  readonly id: string
  readonly criterionId: string
  readonly expectedOutcome: string
  readonly actualOutcome: string
  readonly result: TvaCriterionResult
  readonly explanation: string
  readonly evidenceIds: readonly string[]
  readonly deviationStatus: 'none' | 'reported' | 'approved' | 'governed_exception'
  readonly deviationSummary: string | null
  readonly deviationApprovalRef: string | null
  readonly notApplicableReason: string | null
  readonly notApplicablePolicyRef: string | null
}

export interface CompletionEvidenceInput {
  readonly id: string
  readonly evidenceRequirementIds: readonly string[]
  readonly criterionIds: readonly string[]
  readonly deliverableIds: readonly string[]
  readonly ownerUserId: string
  readonly contributorUserIds: readonly string[]
  readonly reviewerAccessState: 'available' | 'restricted' | 'unavailable' | 'unknown'
  readonly availability: 'available' | 'partially_available' | 'unavailable' | 'not_disclosed'
  readonly privacyClassification: TvaPrivacyClassification
}

export interface CompletionContributorClaimInput {
  readonly id: string
  readonly contributorUserId: string
  readonly action: string
  readonly object: string
  readonly actualRole: string
  readonly actualOwnership: TvaOwnershipLevel | null
  readonly contributionStatement: string
  readonly deliverableIds: readonly string[]
  readonly criterionResultIds: readonly string[]
  readonly evidenceIds: readonly string[]
}

export interface CompletionReportInput {
  readonly id: string
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly assignmentSnapshotId: string
  readonly assignmentSnapshotHash: TvaSha256
  readonly taskContractVersionId: string
  readonly reportedBy: string
  readonly workPerformed: string
  readonly contributionStatement: string
  readonly actualRole: string
  readonly actualOwnership: TvaOwnershipLevel | null
  readonly actualAutonomy: TvaAutonomyLevel | null
  readonly actualDeliverableIds: readonly string[]
  readonly actualOutcomes: TvaJsonObject
  readonly impactObserved: TvaJsonObject
  readonly limitations: string | null
  readonly remainingWork: string | null
  readonly criterionResults: readonly CompletionCriterionResultInput[]
  readonly evidence: readonly CompletionEvidenceInput[]
  readonly contributorClaims: readonly CompletionContributorClaimInput[]
}

export interface TaskCompletionReportValidationInput {
  readonly intent: 'save_draft' | 'submit_for_review'
  readonly assignmentSnapshot: TaskAssignmentSnapshotV1
  readonly report: CompletionReportInput
}

export interface CompletionEvidenceAccessProjection {
  readonly evidenceId: string
  readonly privacyClassification: TvaPrivacyClassification
  readonly reviewerAccessState: CompletionEvidenceInput['reviewerAccessState']
  readonly reviewerHasAccess: boolean
}

export interface TaskCompletionReportValidationResult {
  readonly allowed: boolean
  readonly action: 'save_draft' | 'submit_for_review' | 'reject'
  readonly blockerCodes: readonly TaskCompletionReportCode[]
  readonly evidenceAccess: readonly CompletionEvidenceAccessProjection[]
}

function meaningful(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function hasJsonContent(value: TvaJsonObject): boolean {
  return Object.keys(value).length > 0
}

function addIfMissing(
  codes: Set<TaskCompletionReportCode>,
  condition: boolean,
  code: TaskCompletionReportCode
): void {
  if (condition) codes.add(code)
}

function duplicateValues(values: readonly string[]): ReadonlySet<string> {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  }
  return duplicates
}

function hasForeign(values: readonly string[], allowed: ReadonlySet<string>): boolean {
  return values.some((value) => !allowed.has(value))
}

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

  addIfMissing(codes, report.taskId !== snapshot.taskId, TASK_COMPLETION_REPORT_CODES.taskProvenanceMismatch)
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

  addIfMissing(codes, !meaningful(report.workPerformed), TASK_COMPLETION_REPORT_CODES.workPerformedRequired)
  addIfMissing(codes, !meaningful(report.contributionStatement), TASK_COMPLETION_REPORT_CODES.contributionRequired)
  addIfMissing(codes, !meaningful(report.actualRole), TASK_COMPLETION_REPORT_CODES.actualRoleRequired)
  addIfMissing(codes, report.actualOwnership === null, TASK_COMPLETION_REPORT_CODES.actualOwnershipRequired)
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
    addIfMissing(codes, !meaningful(result.actualOutcome), TASK_COMPLETION_REPORT_CODES.criterionActualRequired)
    addIfMissing(codes, !meaningful(result.explanation), TASK_COMPLETION_REPORT_CODES.criterionExplanationRequired)
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
      if (result.deviationStatus === 'approved' || result.deviationStatus === 'governed_exception') {
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
  addIfMissing(codes, duplicateValues(evidenceIds).size > 0, TASK_COMPLETION_REPORT_CODES.evidenceDuplicate)
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
      !report.evidence.some((evidence) => evidence.evidenceRequirementIds.includes(requirement.id)),
      TASK_COMPLETION_REPORT_CODES.requiredEvidenceMissing
    )
  }

  for (const result of report.criterionResults) {
    if (!expectedCriteria.has(result.criterionId) || result.result === 'not_applicable') continue
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
  addIfMissing(codes, duplicateValues(claimIds).size > 0, TASK_COMPLETION_REPORT_CODES.claimDuplicate)
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
      !meaningful(claim.contributionStatement) || !meaningful(claim.actualRole) || claim.actualOwnership === null,
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
    action: input.intent === 'save_draft' ? 'save_draft' : canSubmit ? 'submit_for_review' : 'reject',
    blockerCodes,
    evidenceAccess,
  }
}
