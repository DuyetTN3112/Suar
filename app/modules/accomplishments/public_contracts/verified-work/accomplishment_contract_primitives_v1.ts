import { z } from 'zod'

import {
  TVA_AUTONOMY_LEVELS,
  TVA_COLLABORATION_TYPES,
  TVA_OWNERSHIP_LEVELS,
  TVA_PRIVACY_CLASSIFICATIONS,
  TVA_PROVENANCE_CLASSES,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export const ACCOMPLISHMENT_CONTRACT_VERSION_V1 = 1 as const
export const ACCOMPLISHMENT_MAX_CONTRACT_BYTES_V1 = 512 * 1_024
export const ACCOMPLISHMENT_MAX_PUBLIC_PROJECTION_BYTES_V1 = 128 * 1_024

export const ACCOMPLISHMENT_LIFECYCLE_STATES_V1 = [
  'candidate',
  'under_review',
  'verified',
  'partially_verified',
  'frozen',
  'superseded',
  'revoked',
] as const

export const ACCOMPLISHMENT_VISIBILITIES_V1 = ['private', 'internal', 'public'] as const
export const ACCOMPLISHMENT_CONFIDENCE_BANDS_V1 = ['low', 'medium', 'high'] as const

export const accomplishmentContractVersionV1Schema = z.literal(ACCOMPLISHMENT_CONTRACT_VERSION_V1)
export const accomplishmentUuidV1Schema = z.uuid()
export const accomplishmentIsoTimestampV1Schema = z.iso.datetime({ offset: true })
export const accomplishmentSha256V1Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/)
export const accomplishmentTaxonomyCodeV1Schema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9_.:-]*$/)
export const accomplishmentShortTextV1Schema = z.string().trim().min(1).max(500)
export const accomplishmentLongTextV1Schema = z.string().trim().min(1).max(20_000)

export const accomplishmentOwnershipLevelV1Schema = z.enum(TVA_OWNERSHIP_LEVELS)
export const accomplishmentAutonomyLevelV1Schema = z.enum(TVA_AUTONOMY_LEVELS)
export const accomplishmentCollaborationTypeV1Schema = z.enum(TVA_COLLABORATION_TYPES)
export const accomplishmentPrivacyClassificationV1Schema = z.enum(TVA_PRIVACY_CLASSIFICATIONS)
export const accomplishmentProvenanceClassV1Schema = z.enum(TVA_PROVENANCE_CLASSES)
export const accomplishmentLifecycleStateV1Schema = z.enum(ACCOMPLISHMENT_LIFECYCLE_STATES_V1)
export const accomplishmentVisibilityV1Schema = z.enum(ACCOMPLISHMENT_VISIBILITIES_V1)
export const accomplishmentConfidenceBandV1Schema = z.enum(ACCOMPLISHMENT_CONFIDENCE_BANDS_V1)

export type AccomplishmentLifecycleStateV1 = z.output<typeof accomplishmentLifecycleStateV1Schema>
export type AccomplishmentVisibilityV1 = z.output<typeof accomplishmentVisibilityV1Schema>
export type AccomplishmentConfidenceBandV1 = z.output<typeof accomplishmentConfidenceBandV1Schema>

export function hasUniqueValuesV1(values: readonly string[]): boolean {
  return new Set(values).size === values.length
}

export function hasUniquePropertyV1<T>(
  values: readonly T[],
  getValue: (value: T) => string
): boolean {
  const properties = values.map(getValue)
  return hasUniqueValuesV1(properties)
}

export function serializedContractSizeV1(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength
}
