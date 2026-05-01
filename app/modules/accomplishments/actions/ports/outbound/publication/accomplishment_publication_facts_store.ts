import type { GovernedAccomplishmentPublicationSource } from './governed_accomplishment_publication_source_reader.js'

import type {
  AuthoritativeAccomplishmentDisclosureDecision,
  AuthoritativeAccomplishmentPublicationConsent,
  PublicCapabilityDisclosure,
} from '#modules/accomplishments/domain/publication/accomplishment_public_projection_rules'
import type { AccomplishmentLifecycleStateV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'
import type { VerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

export interface AccomplishmentPublicationCanonicalSource {
  readonly accomplishment: VerifiedWorkAccomplishmentV1
  readonly lifecycleRevisionId: string
  readonly lifecycleState: AccomplishmentLifecycleStateV1
  readonly hasOpenDispute: boolean
  readonly allowedCapabilities: readonly PublicCapabilityDisclosure[]
}

export interface PersistedDisclosureDecision {
  readonly decisionId: string
  readonly decisionHash: TvaSha256
  readonly accomplishmentId: string
  readonly subjectUserId: string
  readonly allowed: boolean
  readonly policyVersion: string
  readonly decidedAt: string
  readonly content: GovernedAccomplishmentPublicationSource['disclosureDecision']['content']
}

export interface PersistedPublicationConsent {
  readonly consentFactId: string
  readonly consentFactHash: TvaSha256
  readonly accomplishmentId: string
  readonly subjectUserId: string
  readonly granted: boolean
  readonly sourceCanonicalHash: TvaSha256
  readonly sourceLifecycleRevisionId: string
  readonly disclosureDecisionId: string
  readonly disclosureDecisionHash: TvaSha256
  readonly disclosurePolicyVersion: string
  readonly consentedAt: string
  readonly idempotencyKey: string
}

export interface AccomplishmentPublicationFactsStore {
  loadCanonicalSource(
    accomplishmentId: string
  ): Promise<AccomplishmentPublicationCanonicalSource | null>

  loadForPublication(
    accomplishmentId: string
  ): Promise<GovernedAccomplishmentPublicationSource | null>

  loadPreparedPublication(
    accomplishmentId: string,
    idempotencyKey: string
  ): Promise<{
    readonly decision: AuthoritativeAccomplishmentDisclosureDecision
    readonly consent: AuthoritativeAccomplishmentPublicationConsent
  } | null>

  appendDecision(input: PersistedDisclosureDecision): Promise<void>

  appendConsent(input: PersistedPublicationConsent): Promise<void>
}
