import type {
  TvaAutonomyLevel,
  TvaClaimStatus,
  TvaGovernanceState,
  TvaIsoTimestamp,
  TvaJsonObject,
  TvaOwnershipLevel,
  TvaPrivacyClassification,
  TvaReviewDisposition,
  TvaReviewObservationType,
  TvaSha256,
  TvaUuid,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export interface CompletionClaimV1 {
  readonly schemaVersion: 'suar.completion_claim.v1'
  readonly id: TvaUuid
  readonly completionReportId: TvaUuid
  readonly completionReportRevision: number
  readonly completionReportHash: TvaSha256
  readonly assignmentSnapshotId: TvaUuid
  readonly taskContractVersionId: TvaUuid
  readonly userId: TvaUuid
  readonly action: string
  readonly object: string
  readonly proposedTitle: string
  readonly proposedStatement: string
  readonly actualRole: string
  readonly actualOwnership: TvaOwnershipLevel
  readonly actualAutonomy: TvaAutonomyLevel | null
  readonly contributionStatement: string
  readonly deliverableRefs: readonly TvaUuid[]
  readonly criterionResultRefs: readonly TvaUuid[]
  readonly evidenceRefs: readonly TvaUuid[]
  readonly outcomeData: TvaJsonObject
  readonly publicClaimDraft: string | null
  readonly privacyClassification: TvaPrivacyClassification
  readonly status: TvaClaimStatus
  readonly createdAt: TvaIsoTimestamp
}

export interface ReviewObservationV1 {
  readonly schemaVersion: 'suar.review_observation.v1'
  readonly id: TvaUuid
  readonly reviewWorkflowId: TvaUuid
  readonly reviewSessionId: TvaUuid
  readonly reviewRevision: number
  readonly reviewPolicyVersion: string
  readonly capabilityTaxonomyVersion: string | null
  readonly assignmentSnapshotId: TvaUuid
  readonly sourceSnapshotHash: TvaSha256
  readonly taskAssignmentId: TvaUuid
  readonly subjectUserId: TvaUuid
  readonly observationType: TvaReviewObservationType
  readonly targetRef: TvaUuid
  readonly disposition: TvaReviewDisposition
  readonly structuredValue: TvaJsonObject
  readonly rationale: string
  readonly evidenceRefs: readonly TvaUuid[]
  readonly reviewerId: TvaUuid
  readonly reviewerType: string
  readonly confidence: number | null
  readonly assessmentCeiling: number | null
  readonly governanceState: TvaGovernanceState
  readonly supersedesObservationId: TvaUuid | null
  readonly createdAt: TvaIsoTimestamp
  readonly finalizedAt: TvaIsoTimestamp | null
}

/**
 * Compatibility input only. It cannot satisfy a native assignment/completion provenance contract.
 */
export interface LegacyTaskSubmissionV1 {
  readonly schemaVersion: 'suar.legacy_task_submission.v1'
  readonly submissionId: TvaUuid
  readonly taskId: TvaUuid
  readonly userId: TvaUuid
  readonly summary: string
  readonly implementationNotes: string | null
  readonly limitations: string | null
  readonly testNotes: string | null
  readonly submittedAt: TvaIsoTimestamp | null
  readonly provenanceClass: 'legacy_unverified'
}
