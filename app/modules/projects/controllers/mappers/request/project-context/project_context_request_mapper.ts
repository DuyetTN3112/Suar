import {
  TVA_CHANGE_CLASSES,
  TVA_PRIVACY_CLASSIFICATIONS,
  type TvaChangeClass,
  type TvaJsonObject,
  type TvaJsonValue,
  type TvaPrivacyClassification,
  type TvaSourceProvenanceV1,
} from '#modules/tasks/public_contracts/task-authoring/primitives'
import ValidationException from '#modules/errors/public_contracts/validation_exception'

const CHANGE_CLASSES = new Set<string>(TVA_CHANGE_CLASSES)
const PRIVACY_CLASSES = new Set<string>(TVA_PRIVACY_CLASSIFICATIONS)
const REFERENCE_ACCESS = new Set(['public', 'authenticated', 'restricted', 'unknown'])

export interface ProjectContextPublicationBody {
  readonly expectedActiveVersionId: string | null
  readonly title: string
  readonly summary: string
  readonly plainTextProjection: string
  readonly richContent: TvaJsonValue
  readonly structuredDefaults: TvaJsonObject
  readonly supportingReferences: ReadonlyArray<{
    url: string
    access: 'public' | 'authenticated' | 'restricted' | 'unknown'
  }>
  readonly confirmed: boolean
  readonly changeClass: TvaChangeClass
  readonly changeReason: string | null
  readonly privacyClassification: TvaPrivacyClassification
  readonly sourceProvenance: TvaSourceProvenanceV1
}

function invalid(field: string): never {
  throw ValidationException.field(field, `${field} is invalid.`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function boundedText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > max) invalid(field)
  return value
}

function optionalId(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) invalid(field)
  return value
}

function references(
  value: unknown
): ReadonlyArray<{ url: string; access: 'public' | 'authenticated' | 'restricted' | 'unknown' }> {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 50) invalid('supportingReferences')
  return value.map((entry) => {
    if (!isRecord(entry)) invalid('supportingReferences')
    const url = boundedText(entry['url'], 'supportingReferences.url', 2_048)
    const access = entry['access']
    if (typeof access !== 'string' || !REFERENCE_ACCESS.has(access)) {
      invalid('supportingReferences.access')
    }
    return { url, access: access as 'public' | 'authenticated' | 'restricted' | 'unknown' }
  })
}

function sharedFields(body: Record<string, unknown>) {
  const changeClass = body['changeClass'] ?? 'initial'
  if (typeof changeClass !== 'string' || !CHANGE_CLASSES.has(changeClass)) invalid('changeClass')

  const privacy = body['privacyClassification'] ?? 'internal'
  if (typeof privacy !== 'string' || !PRIVACY_CLASSES.has(privacy)) {
    invalid('privacyClassification')
  }

  if (body['confirmed'] !== true && body['confirmed'] !== false) invalid('confirmed')

  const changeReason = body['changeReason']
  if (changeReason !== undefined && changeReason !== null && typeof changeReason !== 'string') {
    invalid('changeReason')
  }

  return {
    confirmed: body['confirmed'],
    changeClass: changeClass as TvaChangeClass,
    changeReason: changeReason ?? null,
    privacyClassification: privacy as TvaPrivacyClassification,
    // Provenance is server-derived: a client cannot claim a different origin or
    // forge a confirmation it did not perform.
    sourceProvenance: {
      class: 'native_prework',
      sourceType: 'authored',
      sourceReferenceIds: [],
      confirmedBy: null,
      confirmedAt: null,
    } satisfies TvaSourceProvenanceV1,
  }
}

export function buildProjectContextPublication(body: unknown): ProjectContextPublicationBody {
  if (!isRecord(body)) invalid('request')
  return {
    expectedActiveVersionId: optionalId(body['expectedActiveVersionId'], 'expectedActiveVersionId'),
    title: boundedText(body['title'], 'title', 240),
    summary: boundedText(body['summary'], 'summary', 2_000),
    plainTextProjection: boundedText(body['plainTextProjection'], 'plainTextProjection', 100_000),
    richContent: (body['richContent'] ?? {}) as TvaJsonValue,
    structuredDefaults: (body['structuredDefaults'] ?? {}) as TvaJsonObject,
    supportingReferences: references(body['supportingReferences']),
    ...sharedFields(body),
  }
}

export interface WorkPackagePublicationBody extends Omit<ProjectContextPublicationBody, 'structuredDefaults' | 'supportingReferences'> {
  readonly workPackageId: string | null
  readonly projectContextVersionId: string | null
  readonly key: string
  readonly structuredOverrides: TvaJsonObject
}

export function buildWorkPackagePublication(body: unknown): WorkPackagePublicationBody {
  if (!isRecord(body)) invalid('request')
  return {
    workPackageId: optionalId(body['workPackageId'], 'workPackageId'),
    projectContextVersionId: optionalId(
      body['projectContextVersionId'],
      'projectContextVersionId'
    ),
    expectedActiveVersionId: optionalId(body['expectedActiveVersionId'], 'expectedActiveVersionId'),
    key: boundedText(body['key'], 'key', 64),
    title: boundedText(body['title'], 'title', 240),
    summary: boundedText(body['summary'], 'summary', 2_000),
    plainTextProjection: boundedText(body['plainTextProjection'], 'plainTextProjection', 100_000),
    richContent: (body['richContent'] ?? {}) as TvaJsonValue,
    structuredOverrides: (body['structuredOverrides'] ?? {}) as TvaJsonObject,
    ...sharedFields(body),
  }
}

export interface WorkPackageArchiveBody {
  readonly expectedActiveVersionId: string | null
}

export function buildWorkPackageArchiveRequest(body: unknown): WorkPackageArchiveBody {
  if (!isRecord(body)) invalid('request')
  return {
    expectedActiveVersionId: optionalId(body['expectedActiveVersionId'], 'expectedActiveVersionId'),
  }
}
