import { z } from 'zod'

import {
  ACCOMPLISHMENT_MAX_CONTRACT_BYTES_V1,
  accomplishmentConfidenceBandV1Schema,
  accomplishmentContractVersionV1Schema,
  accomplishmentIsoTimestampV1Schema,
  accomplishmentOwnershipLevelV1Schema,
  accomplishmentShortTextV1Schema,
  accomplishmentTaxonomyCodeV1Schema,
  accomplishmentUuidV1Schema,
  hasUniqueValuesV1,
  serializedContractSizeV1,
} from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'

const capabilitySignalContextV1Schema = z
  .object({
    action: accomplishmentTaxonomyCodeV1Schema,
    object: accomplishmentTaxonomyCodeV1Schema,
    ownershipLevel: accomplishmentOwnershipLevelV1Schema,
    complexitySummary: accomplishmentShortTextV1Schema.nullable(),
  })
  .strict()

export const accomplishmentCapabilitySignalV1Schema = z
  .object({
    contractVersion: accomplishmentContractVersionV1Schema,
    id: accomplishmentUuidV1Schema,
    accomplishmentId: accomplishmentUuidV1Schema,
    subjectUserId: accomplishmentUuidV1Schema,
    capabilityId: accomplishmentUuidV1Schema,
    observedBehaviour: accomplishmentShortTextV1Schema,
    observedLevelCode: accomplishmentTaxonomyCodeV1Schema.nullable(),
    assessmentCeilingCode: accomplishmentTaxonomyCodeV1Schema.nullable(),
    direction: z.enum(['positive', 'negative', 'neutral']),
    applicability: z.enum(['direct', 'supporting', 'contextual']),
    context: capabilitySignalContextV1Schema,
    evidenceReferences: z
      .array(accomplishmentUuidV1Schema)
      .min(1)
      .max(500)
      .refine(hasUniqueValuesV1, { message: 'evidence references must be unique' }),
    reviewObservationIds: z
      .array(accomplishmentUuidV1Schema)
      .min(1)
      .max(500)
      .refine(hasUniqueValuesV1, { message: 'review observation ids must be unique' }),
    confidenceScore: z.number().min(0).max(1).nullable(),
    confidenceBand: accomplishmentConfidenceBandV1Schema,
    signalState: z.enum(['active', 'frozen', 'superseded', 'revoked']),
    policyVersion: accomplishmentTaxonomyCodeV1Schema,
    observedAt: accomplishmentIsoTimestampV1Schema,
  })
  .strict()
  .refine((value) => serializedContractSizeV1(value) <= ACCOMPLISHMENT_MAX_CONTRACT_BYTES_V1, {
    message: 'accomplishment capability signal exceeds the V1 size limit',
  })

export type AccomplishmentCapabilitySignalV1 = z.output<
  typeof accomplishmentCapabilitySignalV1Schema
>

export function parseAccomplishmentCapabilitySignalV1(
  value: unknown
): AccomplishmentCapabilitySignalV1 {
  return accomplishmentCapabilitySignalV1Schema.parse(value)
}

export function isAccomplishmentCapabilitySignalV1(
  value: unknown
): value is AccomplishmentCapabilitySignalV1 {
  return accomplishmentCapabilitySignalV1Schema.safeParse(value).success
}
