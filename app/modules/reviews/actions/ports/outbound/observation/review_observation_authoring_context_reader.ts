import type { CompletionClaimV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type {
  TvaPrivacyClassification,
  TvaReviewObservationType,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export interface ReviewObservationAuthoringContextInput {
  readonly reviewWorkflowId: string
  readonly reviewSessionId: string
  readonly taskAssignmentId: string
  readonly assignmentSnapshotId: string
  readonly completionReportId: string
  readonly completionClaimId: string | null
  readonly reviewerId: string
  readonly reviewerType: string
  readonly subjectUserId: string
  readonly observationType: TvaReviewObservationType
  readonly targetRef: string
  readonly sourceSnapshotHash: TvaSha256
  readonly evidenceIds: readonly string[]
}

export interface ReviewObservationAuthoritativeEvidence {
  readonly evidenceId: string
  readonly accessClassification: TvaPrivacyClassification
  readonly reviewerAccessState: 'available' | 'restricted' | 'unavailable' | 'unknown'
  readonly evidenceHash: TvaSha256 | null
}

export interface ReviewObservationAuthoringContext {
  readonly reviewerEligible: boolean
  readonly reviewerConflict: boolean
  readonly reviewerRole: string
  readonly authorizedAssessmentCeiling: number | null
  readonly taskAssignmentHash: TvaSha256
  readonly assignmentSnapshotHash: TvaSha256
  readonly completionReportId: string
  readonly completionReportHash: TvaSha256
  readonly completionClaim: CompletionClaimV1 | null
  readonly completionClaimHash: TvaSha256 | null
  readonly sourceSnapshotId: string
  readonly taskContractVersionId: string
  readonly taskContractHash: TvaSha256
  readonly evidence: readonly ReviewObservationAuthoritativeEvidence[]
}

export interface ReviewObservationAuthoringContextReader {
  load(
    input: ReviewObservationAuthoringContextInput
  ): Promise<ReviewObservationAuthoringContext | null>
}
