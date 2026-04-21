import type {
  AccomplishmentDisclosurePolicy,
  AccomplishmentDisclosurePolicyDecision,
} from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_disclosure_policy'

const POLICY_VERSION = 'public-disclosure-v1'

/**
 * Conservative production policy until a richer organization policy store is
 * available: only a canonical accomplishment already marked public may leave
 * its source boundary. Internal/private source visibility fails closed.
 */
export default class CanonicalVisibilityAccomplishmentDisclosurePolicy
  implements AccomplishmentDisclosurePolicy
{
  evaluate(_input: {
    readonly actorUserId: string
    readonly source: Parameters<AccomplishmentDisclosurePolicy['evaluate']>[0]['source']
  }): AccomplishmentDisclosurePolicyDecision {
    const allowed = _input.source.accomplishment.visibility === 'public'
    return {
      allowed,
      policyVersion: POLICY_VERSION,
      reasonCode: allowed ? null : 'source_visibility_not_public',
    }
  }
}
