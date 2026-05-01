import type {
  AuthoritativeAccomplishmentDisclosureDecision,
  AuthoritativeAccomplishmentPublicationConsent,
  PublicCapabilityDisclosure,
} from '#modules/accomplishments/domain/publication/accomplishment_public_projection_rules'
import type { AccomplishmentLifecycleStateV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'
import type { VerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'

export interface GovernedAccomplishmentPublicationSource {
  readonly accomplishment: VerifiedWorkAccomplishmentV1
  readonly lifecycleRevisionId: string
  readonly lifecycleState: AccomplishmentLifecycleStateV1
  readonly hasOpenDispute: boolean
  readonly disclosureDecision: AuthoritativeAccomplishmentDisclosureDecision
  readonly publicationConsent: AuthoritativeAccomplishmentPublicationConsent
  readonly allowedCapabilities: readonly PublicCapabilityDisclosure[]
}

/**
 * This port must return the canonical accomplishment, current lifecycle head, current dispute state,
 * and a disclosure decision issued by authoritative organization policy. HTTP/client wording is not
 * a valid implementation of this port.
 */
export interface GovernedAccomplishmentPublicationSourceReader {
  loadForPublication(
    accomplishmentId: string
  ): Promise<GovernedAccomplishmentPublicationSource | null>
}
