import { z } from 'zod'

import {
  ACCOMPLISHMENT_MAX_CONTRACT_BYTES_V1,
  accomplishmentAutonomyLevelV1Schema,
  accomplishmentCollaborationTypeV1Schema,
  accomplishmentConfidenceBandV1Schema,
  accomplishmentContractVersionV1Schema,
  accomplishmentIsoTimestampV1Schema,
  accomplishmentLifecycleStateV1Schema,
  accomplishmentLongTextV1Schema,
  accomplishmentOwnershipLevelV1Schema,
  accomplishmentPrivacyClassificationV1Schema,
  accomplishmentProvenanceClassV1Schema,
  accomplishmentSha256V1Schema,
  accomplishmentShortTextV1Schema,
  accomplishmentTaxonomyCodeV1Schema,
  accomplishmentUuidV1Schema,
  accomplishmentVisibilityV1Schema,
  hasUniquePropertyV1,
  hasUniqueValuesV1,
  serializedContractSizeV1,
} from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'

const accomplishmentContextV1Schema = z
  .object({
    businessContext: accomplishmentShortTextV1Schema.nullable(),
    systemArea: accomplishmentTaxonomyCodeV1Schema.nullable(),
    environment: accomplishmentTaxonomyCodeV1Schema.nullable(),
    scaleSummary: accomplishmentShortTextV1Schema.nullable(),
    constraints: z
      .array(accomplishmentShortTextV1Schema)
      .max(100)
      .refine(hasUniqueValuesV1, { message: 'constraints must not contain duplicates' }),
  })
  .strict()

const accomplishmentComplexityV1Schema = z
  .object({
    summary: accomplishmentShortTextV1Schema.nullable(),
    factors: z
      .array(accomplishmentShortTextV1Schema)
      .max(100)
      .refine(hasUniqueValuesV1, { message: 'complexity factors must not contain duplicates' }),
    novelty: accomplishmentTaxonomyCodeV1Schema.nullable(),
    risk: z.enum(['low', 'medium', 'high', 'critical']).nullable(),
  })
  .strict()

const accomplishmentDeliverableV1Schema = z
  .object({
    deliverableRef: accomplishmentTaxonomyCodeV1Schema,
    title: accomplishmentShortTextV1Schema,
    kind: accomplishmentTaxonomyCodeV1Schema,
    summary: accomplishmentShortTextV1Schema.nullable(),
  })
  .strict()

const accomplishmentOutcomeV1Schema = z
  .object({
    outcomeRef: accomplishmentTaxonomyCodeV1Schema,
    statement: accomplishmentShortTextV1Schema,
    result: z.enum(['met', 'partially_met', 'not_met', 'not_applicable']),
    explanation: accomplishmentLongTextV1Schema,
    metricName: accomplishmentTaxonomyCodeV1Schema.nullable(),
    metricValue: z.string().trim().min(1).max(128).nullable(),
    metricUnit: accomplishmentTaxonomyCodeV1Schema.nullable(),
    observedAt: accomplishmentIsoTimestampV1Schema.nullable(),
  })
  .strict()

const accomplishmentReviewerReferenceV1Schema = z
  .object({
    reviewerId: accomplishmentUuidV1Schema,
    reviewerRole: accomplishmentTaxonomyCodeV1Schema,
  })
  .strict()

const accomplishmentVerificationV1Schema = z
  .object({
    status: z.enum(['pending', 'partially_verified', 'verified']),
    method: accomplishmentTaxonomyCodeV1Schema,
    confidenceScore: z.number().min(0).max(1).nullable(),
    confidenceBand: accomplishmentConfidenceBandV1Schema,
    evidenceSufficiency: z.enum(['pending', 'adequate', 'governed_exception', 'inadequate']),
    reviewerReferences: z
      .array(accomplishmentReviewerReferenceV1Schema)
      .max(50)
      .refine((values) => hasUniquePropertyV1(values, (value) => value.reviewerId), {
        message: 'reviewer references must not contain duplicate reviewer ids',
      }),
    verifiedAt: accomplishmentIsoTimestampV1Schema.nullable(),
  })
  .strict()

const accomplishmentEvidenceReferenceV1Schema = z
  .object({
    evidenceId: accomplishmentUuidV1Schema,
    evidenceType: accomplishmentTaxonomyCodeV1Schema,
    accessClassification: accomplishmentPrivacyClassificationV1Schema,
    availability: z.enum(['available', 'partially_available', 'unavailable', 'not_disclosed']),
    contentHash: accomplishmentSha256V1Schema.nullable(),
  })
  .strict()

const accomplishmentSourceHashesV1Schema = z
  .object({
    taskSpecification: accomplishmentSha256V1Schema,
    taskContract: accomplishmentSha256V1Schema,
    assignmentSnapshot: accomplishmentSha256V1Schema,
    completionReport: accomplishmentSha256V1Schema,
    review: accomplishmentSha256V1Schema.nullable(),
  })
  .strict()

const accomplishmentReconstructionV1Schema = z
  .object({
    reconstructedAt: accomplishmentIsoTimestampV1Schema,
    reconstructedByUserId: accomplishmentUuidV1Schema,
    limitations: z
      .array(accomplishmentShortTextV1Schema)
      .min(1)
      .max(100)
      .refine(hasUniqueValuesV1, { message: 'reconstruction limitations must be unique' }),
    firsthandReviewerConfirmed: z.boolean(),
  })
  .strict()

export const accomplishmentProvenanceV1Schema = z
  .object({
    provenanceClass: accomplishmentProvenanceClassV1Schema,
    projectContextVersionId: accomplishmentUuidV1Schema.nullable(),
    workPackageVersionId: accomplishmentUuidV1Schema.nullable(),
    taskSpecificationVersionId: accomplishmentUuidV1Schema,
    taskContractVersionId: accomplishmentUuidV1Schema,
    assignmentSnapshotId: accomplishmentUuidV1Schema,
    completionReportId: accomplishmentUuidV1Schema,
    completionClaimIds: z
      .array(accomplishmentUuidV1Schema)
      .min(1)
      .max(100)
      .refine(hasUniqueValuesV1, { message: 'completion claim ids must be unique' }),
    reviewWorkflowId: accomplishmentUuidV1Schema,
    reviewObservationIds: z
      .array(accomplishmentUuidV1Schema)
      .max(500)
      .refine(hasUniqueValuesV1, { message: 'review observation ids must be unique' }),
    sourceHashes: accomplishmentSourceHashesV1Schema,
    policyVersion: accomplishmentTaxonomyCodeV1Schema,
    reconstruction: accomplishmentReconstructionV1Schema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.provenanceClass === 'retrospective' && value.reconstruction === null) {
      context.addIssue({
        code: 'custom',
        path: ['reconstruction'],
        message: 'retrospective provenance requires reconstruction limitations',
      })
    }
    if (value.provenanceClass !== 'retrospective' && value.reconstruction !== null) {
      context.addIssue({
        code: 'custom',
        path: ['reconstruction'],
        message: 'only retrospective provenance may include reconstruction metadata',
      })
    }
  })

export const verifiedWorkAccomplishmentV1Schema = z
  .object({
    contractVersion: accomplishmentContractVersionV1Schema,
    id: accomplishmentUuidV1Schema,
    userId: accomplishmentUuidV1Schema,
    organizationId: accomplishmentUuidV1Schema.nullable(),
    projectId: accomplishmentUuidV1Schema.nullable(),
    taskId: accomplishmentUuidV1Schema,
    taskAssignmentId: accomplishmentUuidV1Schema,
    title: z.string().trim().min(1).max(240),
    conciseStatement: z.string().trim().min(1).max(1_000),
    detailedStatement: accomplishmentLongTextV1Schema.nullable(),
    action: accomplishmentTaxonomyCodeV1Schema,
    object: accomplishmentTaxonomyCodeV1Schema,
    taskType: accomplishmentTaxonomyCodeV1Schema.nullable(),
    businessDomain: accomplishmentTaxonomyCodeV1Schema.nullable(),
    problemCategory: accomplishmentTaxonomyCodeV1Schema.nullable(),
    role: accomplishmentTaxonomyCodeV1Schema.nullable(),
    ownershipLevel: accomplishmentOwnershipLevelV1Schema,
    autonomyLevel: accomplishmentAutonomyLevelV1Schema.nullable(),
    collaborationType: accomplishmentCollaborationTypeV1Schema.nullable(),
    context: accomplishmentContextV1Schema,
    complexity: accomplishmentComplexityV1Schema,
    deliverables: z
      .array(accomplishmentDeliverableV1Schema)
      .max(100)
      .refine((values) => hasUniquePropertyV1(values, (value) => value.deliverableRef), {
        message: 'deliverable references must be unique',
      }),
    outcomes: z
      .array(accomplishmentOutcomeV1Schema)
      .max(100)
      .refine((values) => hasUniquePropertyV1(values, (value) => value.outcomeRef), {
        message: 'outcome references must be unique',
      }),
    reportedOutcomeData: z.record(z.string(), z.json()),
    keyDecisions: z
      .array(accomplishmentShortTextV1Schema)
      .max(100)
      .refine(hasUniqueValuesV1, { message: 'key decisions must be unique' }),
    technology: z
      .array(z.string().trim().min(1).max(120))
      .max(100)
      .refine(hasUniqueValuesV1, { message: 'technology values must be unique' }),
    verification: accomplishmentVerificationV1Schema,
    evidenceReferences: z
      .array(accomplishmentEvidenceReferenceV1Schema)
      .max(500)
      .refine((values) => hasUniquePropertyV1(values, (value) => value.evidenceId), {
        message: 'evidence references must not contain duplicate evidence ids',
      }),
    capabilitySignalIds: z
      .array(accomplishmentUuidV1Schema)
      .max(500)
      .refine(hasUniqueValuesV1, { message: 'capability signal ids must be unique' }),
    lifecycleState: accomplishmentLifecycleStateV1Schema,
    visibility: accomplishmentVisibilityV1Schema,
    provenance: accomplishmentProvenanceV1Schema,
    canonicalHash: accomplishmentSha256V1Schema,
    createdAt: accomplishmentIsoTimestampV1Schema,
    updatedAt: accomplishmentIsoTimestampV1Schema,
  })
  .strict()
  .superRefine((value, context) => {
    const verifiedLifecycle =
      value.lifecycleState === 'verified' || value.lifecycleState === 'partially_verified'

    if (verifiedLifecycle && value.verification.status !== value.lifecycleState) {
      context.addIssue({
        code: 'custom',
        path: ['verification', 'status'],
        message: 'verified lifecycle and verification status must agree',
      })
    }
    if (verifiedLifecycle && value.verification.verifiedAt === null) {
      context.addIssue({
        code: 'custom',
        path: ['verification', 'verifiedAt'],
        message: 'verified accomplishments require a verified timestamp',
      })
    }
    if (verifiedLifecycle && value.verification.reviewerReferences.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['verification', 'reviewerReferences'],
        message: 'verified accomplishments require reviewer provenance',
      })
    }
    if (verifiedLifecycle && value.provenance.reviewObservationIds.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['provenance', 'reviewObservationIds'],
        message: 'verified accomplishments require review observation provenance',
      })
    }
    if (verifiedLifecycle && value.provenance.sourceHashes.review === null) {
      context.addIssue({
        code: 'custom',
        path: ['provenance', 'sourceHashes', 'review'],
        message: 'verified accomplishments require a review source hash',
      })
    }
    if (verifiedLifecycle && value.provenance.provenanceClass === 'legacy_unverified') {
      context.addIssue({
        code: 'custom',
        path: ['provenance', 'provenanceClass'],
        message: 'legacy unverified provenance cannot produce verified lifecycle state',
      })
    }
    if (serializedContractSizeV1(value) > ACCOMPLISHMENT_MAX_CONTRACT_BYTES_V1) {
      context.addIssue({
        code: 'custom',
        message: 'verified work accomplishment contract exceeds the V1 size limit',
      })
    }
  })

export type AccomplishmentProvenanceV1 = z.output<typeof accomplishmentProvenanceV1Schema>
export type VerifiedWorkAccomplishmentV1 = z.output<typeof verifiedWorkAccomplishmentV1Schema>

export function parseVerifiedWorkAccomplishmentV1(value: unknown): VerifiedWorkAccomplishmentV1 {
  return verifiedWorkAccomplishmentV1Schema.parse(value)
}

export function isVerifiedWorkAccomplishmentV1(
  value: unknown
): value is VerifiedWorkAccomplishmentV1 {
  return verifiedWorkAccomplishmentV1Schema.safeParse(value).success
}
