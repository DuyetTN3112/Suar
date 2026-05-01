import type {
  CapabilitySignalLevelScaleEntry,
  GovernedCapabilityObservationSource,
} from '#modules/accomplishments/domain/verified-work/capability_signal_projection_rules'
import type {
  AccomplishmentProjectionSourceIdentity,
  GovernedAccomplishmentObservationFact as GovernedObservationFact,
} from '#modules/accomplishments/domain/verified-work/governed_accomplishment_projection_source_rules'
import type {
  AccomplishmentCompletionReportFacts,
  ImmutableAccomplishmentRequirementContext,
} from '#modules/accomplishments/domain/verified-work/verified_accomplishment_content_derivation'
import type { VerifiedAccomplishmentGateInput } from '#modules/accomplishments/domain/verified-work/verified_accomplishment_projection_rules'
import type { AccomplishmentProvenanceV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import type {
  TvaCollaborationType,
  TvaProvenanceClass,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import type { AccomplishmentTransaction } from '../accomplishment_transaction.js'

export type GovernedAccomplishmentProjectionSourceIdentity =
  AccomplishmentProjectionSourceIdentity

export type GovernedAccomplishmentObservationFact = GovernedObservationFact

export interface GovernedAccomplishmentProjectionSource {
  readonly identity: GovernedAccomplishmentProjectionSourceIdentity
  readonly organizationId: string | null
  readonly projectId: string | null
  readonly projectContextVersionId: string | null
  readonly workPackageVersionId: string | null
  readonly provenanceClass: TvaProvenanceClass
  readonly reconstruction: AccomplishmentProvenanceV1['reconstruction']
  readonly gateInput: VerifiedAccomplishmentGateInput
  readonly governedClaimRef: {
    readonly claimId: string
    readonly claimHash: TvaSha256
    readonly subjectUserId: string
  }
  readonly requirementContext: ImmutableAccomplishmentRequirementContext
  readonly completionReport: AccomplishmentCompletionReportFacts
  readonly observationFacts: readonly GovernedAccomplishmentObservationFact[]
  readonly reviewHash: TvaSha256
  readonly taskType: string | null
  readonly businessDomain: string | null
  readonly problemCategory: string | null
  readonly collaborationType: TvaCollaborationType | null
  readonly complexity: {
    readonly summary: string | null
    readonly factors: readonly string[]
    readonly novelty: string | null
    readonly risk: 'low' | 'medium' | 'high' | 'critical' | null
  }
  readonly keyDecisions: readonly string[]
  readonly technology: readonly string[]
  readonly verification: {
    readonly method: string
    readonly confidenceScore: number | null
    readonly verifiedAt: string
  }
  readonly initialVisibility: 'private' | 'internal'
  readonly capabilityProjection: {
    readonly expectedReviewPolicyVersion: string
    readonly expectedCapabilityTaxonomyVersion: string
    readonly signalPolicyVersion: string
    readonly levelScale: readonly CapabilitySignalLevelScaleEntry[]
    readonly observations: readonly GovernedCapabilityObservationSource[]
  } | null
}

export interface GovernedAccomplishmentProjectionSourceReader {
  load(
    identity: GovernedAccomplishmentProjectionSourceIdentity,
    transaction?: AccomplishmentTransaction
  ): Promise<GovernedAccomplishmentProjectionSource | null>
}
