import { deterministicUuidFromSha256 } from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import type { AccomplishmentContentHasher } from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

export interface AccomplishmentPublicationIdentityInput {
  readonly accomplishmentId: string
  readonly actorUserId: string
  readonly idempotencyKey: string
}

export interface AccomplishmentPublicationIdentity {
  readonly projectionKey: string
  readonly projectionId: string
  readonly requestIdentityHash: TvaSha256
}

export function buildAccomplishmentPublicationIdentity(
  input: AccomplishmentPublicationIdentityInput,
  hasher: AccomplishmentContentHasher
): AccomplishmentPublicationIdentity {
  const requestIdentityHash = hasher.hash({
    schemaVersion: 'suar.accomplishment_publication_request_identity.v1',
    accomplishmentId: input.accomplishmentId,
    actorUserId: input.actorUserId,
    idempotencyKey: input.idempotencyKey,
  })
  return {
    projectionKey: `appub:v1:${requestIdentityHash.slice('sha256:'.length)}`,
    projectionId: deterministicUuidFromSha256(requestIdentityHash),
    requestIdentityHash,
  }
}

export function hashAccomplishmentDisclosureDecision(
  decisionWithoutHash: unknown,
  hasher: AccomplishmentContentHasher
): TvaSha256 {
  return hasher.hash({
    schemaVersion: 'suar.accomplishment_disclosure_decision.v1',
    decision: decisionWithoutHash,
  })
}

export function hashAccomplishmentPublicationConsent(
  consentWithoutHash: unknown,
  hasher: AccomplishmentContentHasher
): TvaSha256 {
  return hasher.hash({
    schemaVersion: 'suar.accomplishment_publication_consent.v1',
    consent: consentWithoutHash,
  })
}
