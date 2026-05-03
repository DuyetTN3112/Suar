import { z } from 'zod'

import {
  accomplishmentConfidenceBandV1Schema,
  accomplishmentIsoTimestampV1Schema,
  accomplishmentProvenanceClassV1Schema,
  accomplishmentSha256V1Schema,
  accomplishmentShortTextV1Schema,
  accomplishmentTaxonomyCodeV1Schema,
  accomplishmentUuidV1Schema,
  hasUniqueValuesV1,
  serializedContractSizeV1,
} from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'

/** Provider-neutral, public-safe document handed to a search adapter. */
export const ACCOMPLISHMENT_SEARCH_DOCUMENT_SCHEMA_V1 =
  'suar.accomplishment_search_document.v1' as const
export const ACCOMPLISHMENT_SEARCH_TAXONOMY_VERSION_V1 = 'accomplishment-taxonomy-v1' as const

const publicTextListV1Schema = z
  .array(accomplishmentShortTextV1Schema)
  .max(50)
  .refine(hasUniqueValuesV1, { message: 'search text values must be unique' })

export const accomplishmentSearchDocumentV1Schema = z
  .object({
    schemaVersion: z.literal(ACCOMPLISHMENT_SEARCH_DOCUMENT_SCHEMA_V1),
    taxonomyVersion: accomplishmentTaxonomyCodeV1Schema,
    documentId: z.string().regex(/^accomplishment:v1:[0-9a-f-]{36}:publication:[1-9][0-9]*$/),
    sourceId: accomplishmentUuidV1Schema,
    sourceCanonicalHash: accomplishmentSha256V1Schema,
    userId: accomplishmentUuidV1Schema,
    title: accomplishmentShortTextV1Schema,
    conciseStatement: accomplishmentShortTextV1Schema,
    action: accomplishmentTaxonomyCodeV1Schema,
    object: accomplishmentTaxonomyCodeV1Schema,
    taskType: accomplishmentTaxonomyCodeV1Schema.nullable(),
    businessDomain: accomplishmentTaxonomyCodeV1Schema.nullable(),
    problemCategory: accomplishmentTaxonomyCodeV1Schema.nullable(),
    role: accomplishmentTaxonomyCodeV1Schema.nullable(),
    ownershipLevel: accomplishmentTaxonomyCodeV1Schema,
    scaleSummary: accomplishmentShortTextV1Schema.nullable(),
    deliverableSummaries: publicTextListV1Schema,
    outcomeSummaries: publicTextListV1Schema,
    capabilities: z
      .array(
        z
          .object({
            capabilityId: accomplishmentUuidV1Schema,
            label: accomplishmentShortTextV1Schema,
            confidenceBand: accomplishmentConfidenceBandV1Schema,
          })
          .strict()
      )
      .max(100),
    verificationStatus: z.enum(['verified', 'partially_verified']),
    confidenceBand: accomplishmentConfidenceBandV1Schema,
    provenanceClass: accomplishmentProvenanceClassV1Schema,
    publishedAt: accomplishmentIsoTimestampV1Schema,
    sourceUpdatedAt: accomplishmentIsoTimestampV1Schema,
    publicationVersion: z.number().int().positive(),
  })
  .strict()
  .refine((value) => serializedContractSizeV1(value) <= 128 * 1024, {
    message: 'accomplishment search document exceeds the V1 size limit',
  })

export type AccomplishmentSearchDocumentV1 = z.output<
  typeof accomplishmentSearchDocumentV1Schema
>

export function parseAccomplishmentSearchDocumentV1(
  value: unknown
): AccomplishmentSearchDocumentV1 {
  return accomplishmentSearchDocumentV1Schema.parse(value)
}

export function isAccomplishmentSearchDocumentV1(
  value: unknown
): value is AccomplishmentSearchDocumentV1 {
  return accomplishmentSearchDocumentV1Schema.safeParse(value).success
}
