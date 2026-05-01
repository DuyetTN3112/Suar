import type { AccomplishmentPublicationCanonicalSource } from './accomplishment_publication_facts_store.js'

export interface AccomplishmentDisclosurePolicyDecision {
  readonly allowed: boolean
  readonly policyVersion: string
  readonly reasonCode: string | null
}

/**
 * Organization/application policy owns the disclosure boundary. User consent
 * remains a separate publication fact and cannot make a denied source public.
 */
export interface AccomplishmentDisclosurePolicy {
  evaluate(input: {
    readonly actorUserId: string
    readonly source: AccomplishmentPublicationCanonicalSource
  }): AccomplishmentDisclosurePolicyDecision
}
