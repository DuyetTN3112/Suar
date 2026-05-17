import { z } from 'zod'

import {
  accomplishmentContractVersionV1Schema,
  accomplishmentIsoTimestampV1Schema,
  accomplishmentLifecycleStateV1Schema,
  accomplishmentSha256V1Schema,
  accomplishmentTaxonomyCodeV1Schema,
  accomplishmentUuidV1Schema,
  accomplishmentVisibilityV1Schema,
} from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'

const accomplishmentLifecycleSourceFactV1Schema = z
  .object({
    id: accomplishmentUuidV1Schema,
    type: z.enum([
      'completion_claim',
      'review_observation',
      'review_finalized',
      'dispute',
      'correction',
      'publication',
      'governance',
    ]),
    hash: accomplishmentSha256V1Schema,
  })
  .strict()

const accomplishmentLifecycleActorV1Schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('user'), userId: accomplishmentUuidV1Schema }).strict(),
  z.object({ type: z.literal('governance'), userId: accomplishmentUuidV1Schema }).strict(),
  z.object({ type: z.literal('system'), userId: z.null() }).strict(),
])

export const accomplishmentLifecycleRevisionV1Schema = z
  .object({
    contractVersion: accomplishmentContractVersionV1Schema,
    id: accomplishmentUuidV1Schema,
    accomplishmentId: accomplishmentUuidV1Schema,
    sequence: z.number().int().positive(),
    previousState: accomplishmentLifecycleStateV1Schema.nullable(),
    nextState: accomplishmentLifecycleStateV1Schema,
    visibility: accomplishmentVisibilityV1Schema,
    reasonCode: z.enum([
      'candidate_created',
      'review_started',
      'verification_completed',
      'partial_verification_completed',
      'dispute_opened',
      'dispute_resolved',
      'publication_changed',
      'correction_issued',
      'superseded',
      'governance_revoked',
    ]),
    sourceFact: accomplishmentLifecycleSourceFactV1Schema,
    actor: accomplishmentLifecycleActorV1Schema,
    policyVersion: accomplishmentTaxonomyCodeV1Schema,
    supersedesRevisionId: accomplishmentUuidV1Schema.nullable(),
    relatedAccomplishmentId: accomplishmentUuidV1Schema.nullable(),
    occurredAt: accomplishmentIsoTimestampV1Schema,
  })
  .strict()

export type AccomplishmentLifecycleRevisionV1 = z.output<
  typeof accomplishmentLifecycleRevisionV1Schema
>

export function parseAccomplishmentLifecycleRevisionV1(
  value: unknown
): AccomplishmentLifecycleRevisionV1 {
  return accomplishmentLifecycleRevisionV1Schema.parse(value)
}

export function isAccomplishmentLifecycleRevisionV1(
  value: unknown
): value is AccomplishmentLifecycleRevisionV1 {
  return accomplishmentLifecycleRevisionV1Schema.safeParse(value).success
}
