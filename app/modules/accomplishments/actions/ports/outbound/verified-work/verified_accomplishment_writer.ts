import type { AccomplishmentCapabilitySignalV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'
import type { AccomplishmentLifecycleRevisionV1 } from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'
import type { VerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import type {
  CompletionClaimV1,
  ReviewObservationV1,
} from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type {
  TvaClaimStatus,
  TvaJsonObject,
  TvaOwnershipLevel,
  TvaPrivacyClassification,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { AccomplishmentTransaction } from '../accomplishment_transaction.js'

export interface VerifiedAccomplishmentClaimLinkInput {
  readonly claim: CompletionClaimV1
  readonly projectedClaimStatus: Extract<TvaClaimStatus, 'verified' | 'partially_verified'>
  readonly projectedOwnershipLevel: TvaOwnershipLevel
  readonly sourceClaimHash: TvaSha256
}

export interface VerifiedAccomplishmentEvidenceLinkInput {
  readonly evidenceId: string
  readonly completionClaimId: string | null
  readonly evidenceType: string
  readonly accessClassification: TvaPrivacyClassification
  readonly availability: 'available' | 'partially_available' | 'unavailable' | 'not_disclosed'
  readonly contentHash: TvaSha256 | null
  readonly evidencePayload: TvaJsonObject
}

export interface VerifiedAccomplishmentReviewObservationLinkInput {
  readonly reviewObservationId: string
  readonly observationRevisionId: string
  readonly observationFactId: string
  readonly observationType: ReviewObservationV1['observationType']
  readonly sourceObservationHash: TvaSha256
  readonly disposition: ReviewObservationV1['disposition']
  readonly governanceState: ReviewObservationV1['governanceState']
  readonly linkPayload: TvaJsonObject
}

export interface VerifiedAccomplishmentCapabilitySignalInput {
  readonly projectionKey: string
  readonly signal: AccomplishmentCapabilitySignalV1
  readonly sourceObservationHash: TvaSha256
}

export interface CreateVerifiedAccomplishmentAggregateInput {
  readonly projectionKey: string
  readonly accomplishment: VerifiedWorkAccomplishmentV1
  readonly claimLinks: readonly VerifiedAccomplishmentClaimLinkInput[]
  readonly evidenceLinks: readonly VerifiedAccomplishmentEvidenceLinkInput[]
  readonly reviewObservationLinks: readonly VerifiedAccomplishmentReviewObservationLinkInput[]
  readonly capabilitySignals: readonly VerifiedAccomplishmentCapabilitySignalInput[]
  readonly lifecycleRevisions: readonly AccomplishmentLifecycleRevisionV1[]
}

export interface PersistedVerifiedAccomplishmentResult {
  readonly inserted: boolean
  readonly accomplishmentId: string
  readonly projectionKey: string
  readonly canonicalHash: TvaSha256
  readonly lifecycleState: VerifiedWorkAccomplishmentV1['lifecycleState']
  readonly lifecycleRevisionId: string
  readonly lifecycleSequence: number
}

export interface VerifiedAccomplishmentWriter {
  createOrLoad(
    input: CreateVerifiedAccomplishmentAggregateInput,
    transaction?: AccomplishmentTransaction
  ): Promise<PersistedVerifiedAccomplishmentResult>
}
