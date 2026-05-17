import { z } from 'zod'

import {
  ACCOMPLISHMENT_MAX_PUBLIC_PROJECTION_BYTES_V1,
  accomplishmentAutonomyLevelV1Schema,
  accomplishmentCollaborationTypeV1Schema,
  accomplishmentConfidenceBandV1Schema,
  accomplishmentContractVersionV1Schema,
  accomplishmentIsoTimestampV1Schema,
  accomplishmentOwnershipLevelV1Schema,
  accomplishmentProvenanceClassV1Schema,
  accomplishmentSha256V1Schema,
  accomplishmentShortTextV1Schema,
  accomplishmentTaxonomyCodeV1Schema,
  accomplishmentUuidV1Schema,
  hasUniquePropertyV1,
  hasUniqueValuesV1,
  serializedContractSizeV1,
} from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'

const publicAccomplishmentContextV1Schema = z
  .object({
    environment: accomplishmentTaxonomyCodeV1Schema.nullable(),
    systemArea: accomplishmentTaxonomyCodeV1Schema.nullable(),
    scaleSummary: accomplishmentShortTextV1Schema.nullable(),
  })
  .strict()

const publicAccomplishmentCapabilityV1Schema = z
  .object({
    capabilityId: accomplishmentUuidV1Schema,
    label: z.string().trim().min(1).max(120),
    confidenceBand: accomplishmentConfidenceBandV1Schema,
  })
  .strict()

const publicAccomplishmentVerificationV1Schema = z
  .object({
    status: z.enum(['verified', 'partially_verified']),
    methodLabel: z.string().trim().min(1).max(200),
    confidenceBand: accomplishmentConfidenceBandV1Schema,
    reviewerRoleLabels: z
      .array(z.string().trim().min(1).max(120))
      .max(20)
      .refine(hasUniqueValuesV1, { message: 'reviewer role labels must be unique' }),
    verifiedAt: accomplishmentIsoTimestampV1Schema,
    evidenceAvailability: z.enum([
      'available',
      'partially_available',
      'unavailable',
      'not_disclosed',
    ]),
    provenanceClass: accomplishmentProvenanceClassV1Schema,
  })
  .strict()

const publicAccomplishmentDisclosureV1Schema = z
  .object({
    redactionState: z.enum(['not_required', 'redacted', 'generalized']),
    disclosurePolicyVersion: accomplishmentTaxonomyCodeV1Schema,
    organizationLabel: z.string().trim().min(1).max(160).nullable(),
    projectLabel: z.string().trim().min(1).max(160).nullable(),
  })
  .strict()

export const accomplishmentPublicProjectionV1Schema = z
  .object({
    contractVersion: accomplishmentContractVersionV1Schema,
    id: accomplishmentUuidV1Schema,
    accomplishmentId: accomplishmentUuidV1Schema,
    userId: accomplishmentUuidV1Schema,
    publicationVersion: z.number().int().positive(),
    sourceLifecycleRevisionId: accomplishmentUuidV1Schema,
    sourceCanonicalHash: accomplishmentSha256V1Schema,
    title: z.string().trim().min(1).max(240),
    conciseStatement: z.string().trim().min(1).max(1_000),
    action: accomplishmentTaxonomyCodeV1Schema,
    object: accomplishmentTaxonomyCodeV1Schema,
    taskType: accomplishmentTaxonomyCodeV1Schema.nullable(),
    businessDomain: accomplishmentTaxonomyCodeV1Schema.nullable(),
    problemCategory: accomplishmentTaxonomyCodeV1Schema.nullable(),
    role: accomplishmentTaxonomyCodeV1Schema.nullable(),
    ownershipLevel: accomplishmentOwnershipLevelV1Schema,
    autonomyLevel: accomplishmentAutonomyLevelV1Schema.nullable(),
    collaborationType: accomplishmentCollaborationTypeV1Schema.nullable(),
    context: publicAccomplishmentContextV1Schema,
    deliverableSummaries: z
      .array(accomplishmentShortTextV1Schema)
      .max(50)
      .refine(hasUniqueValuesV1, { message: 'deliverable summaries must be unique' }),
    outcomeSummaries: z
      .array(accomplishmentShortTextV1Schema)
      .max(50)
      .refine(hasUniqueValuesV1, { message: 'outcome summaries must be unique' }),
    technology: z
      .array(z.string().trim().min(1).max(120))
      .max(100)
      .refine(hasUniqueValuesV1, { message: 'technology values must be unique' }),
    capabilities: z
      .array(publicAccomplishmentCapabilityV1Schema)
      .max(100)
      .refine((values) => hasUniquePropertyV1(values, (value) => value.capabilityId), {
        message: 'public capabilities must not contain duplicate capability ids',
      }),
    verification: publicAccomplishmentVerificationV1Schema,
    disclosure: publicAccomplishmentDisclosureV1Schema,
    publishedAt: accomplishmentIsoTimestampV1Schema,
    sourceUpdatedAt: accomplishmentIsoTimestampV1Schema,
  })
  .strict()
  .refine(
    (value) => serializedContractSizeV1(value) <= ACCOMPLISHMENT_MAX_PUBLIC_PROJECTION_BYTES_V1,
    { message: 'public accomplishment projection exceeds the V1 size limit' }
  )

export type AccomplishmentPublicProjectionV1 = z.output<
  typeof accomplishmentPublicProjectionV1Schema
>

export function parseAccomplishmentPublicProjectionV1(
  value: unknown
): AccomplishmentPublicProjectionV1 {
  return accomplishmentPublicProjectionV1Schema.parse(value)
}

export function isAccomplishmentPublicProjectionV1(
  value: unknown
): value is AccomplishmentPublicProjectionV1 {
  return accomplishmentPublicProjectionV1Schema.safeParse(value).success
}
