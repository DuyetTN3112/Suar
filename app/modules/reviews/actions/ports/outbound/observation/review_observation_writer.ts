import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type { ReviewEvidenceSufficiencyV1 } from '#modules/reviews/public_contracts/observation/review_governance_primitives'
import type {
  TvaJsonObject,
  TvaPrivacyClassification,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export type ReviewRationaleClassification = 'private' | 'internal' | 'confidential'
export type ReviewEvidenceSufficiency = ReviewEvidenceSufficiencyV1

export interface ReviewObservationEvidenceLinkInput {
  readonly evidenceId: string
  readonly relation: 'supports' | 'contradicts' | 'context'
  readonly accessClassification: TvaPrivacyClassification
  readonly reviewerAccessState: 'available' | 'restricted' | 'unavailable' | 'unknown'
  readonly evidenceHash: TvaSha256 | null
}

export interface ReviewObservationRevisionMetadata {
  readonly reviewerRole: string
  readonly taskAssignmentHash: TvaSha256
  readonly assignmentSnapshotHash: TvaSha256
  readonly completionReportId: string
  readonly completionReportHash: TvaSha256
  readonly completionClaimId: string | null
  readonly completionClaimHash: TvaSha256 | null
  readonly sourceSnapshotId: string
  readonly taskContractVersionId: string
  readonly taskContractHash: TvaSha256
  readonly rationaleClassification: ReviewRationaleClassification
  readonly evidenceSufficiency: ReviewEvidenceSufficiency
  readonly revokedAt: string | null
  readonly revokedBy: string | null
  readonly revocationReason: string | null
  readonly disputeId: string | null
  readonly disputeFrozenAt: string | null
  readonly revisionPayload?: TvaJsonObject
}

export interface CreateReviewObservationInput extends ReviewObservationRevisionMetadata {
  readonly idempotencyKey: string
  readonly auditContext?: ReviewActionContext
  readonly observation: ReviewObservationV1
  readonly evidenceLinks: readonly ReviewObservationEvidenceLinkInput[]
}

export interface AppendReviewObservationRevisionInput extends ReviewObservationRevisionMetadata {
  readonly observationId: string
  readonly expectedRevisionNumber: number
  readonly observation: ReviewObservationV1
  readonly evidenceLinks: readonly ReviewObservationEvidenceLinkInput[]
}

export interface PersistedReviewObservationResult {
  readonly inserted: boolean
  readonly observationId: string
  readonly observationFactId: string
  readonly revisionId: string
  readonly revisionNumber: number
  readonly revisionHash: TvaSha256
  readonly governanceState: ReviewObservationV1['governanceState']
}

export interface ReviewObservationWriter {
  createOrLoad(input: CreateReviewObservationInput): Promise<PersistedReviewObservationResult>
  appendRevision(
    input: AppendReviewObservationRevisionInput
  ): Promise<PersistedReviewObservationResult>
}
