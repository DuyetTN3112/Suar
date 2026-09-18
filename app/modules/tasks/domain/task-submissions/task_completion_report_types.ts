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

export function meaningful(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function hasJsonContent(value: TvaJsonObject): boolean {
  return Object.keys(value).length > 0
}

export function addIfMissing(
  codes: Set<TaskCompletionReportCode>,
  condition: boolean,
  code: TaskCompletionReportCode
): void {
  if (condition) codes.add(code)
}

export function duplicateValues(values: readonly string[]): ReadonlySet<string> {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  }
  return duplicates
}

export function hasForeign(values: readonly string[], allowed: ReadonlySet<string>): boolean {
  return values.some((value) => !allowed.has(value))
}
