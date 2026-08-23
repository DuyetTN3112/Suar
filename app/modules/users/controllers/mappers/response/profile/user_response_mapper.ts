import type {
  SerializedModelRecord,
  SerializableModelRecord,
} from './model_response_serialization.js'
import {
  normalizePaginationMeta,
  sanitizePublicSnapshot,
  serializeModelCollectionForHttpResponse,
  serializeModelForHttpResponse,
  serializeNullableModelForHttpResponse,
} from './model_response_serialization.js'

import {
  toCanonicalApiPagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'

const PROFICIENCY_CODE_KEYS = new Set([
  'verified_public_proficiency_code',
  'assigned_public_proficiency_code',
  'required_public_proficiency_code',
  'verifiedPublicProficiencyCode',
  'assignedPublicProficiencyCode',
  'requiredPublicProficiencyCode',
  'levelCode',
])

interface UsersPaginatedResult {
  data: unknown[]
  meta: {
    total: number
    perPage?: number
    currentPage?: number
    lastPage?: number
    per_page?: number
    current_page?: number
    last_page?: number
  }
}

interface UserMetadataShape {
  roles?: { name?: string; value?: string; label?: string }[]
  statuses?: { name?: string; value?: string; label?: string }[]
}

function isSerializedModelRecord(value: unknown): value is SerializedModelRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readValue(record: SerializedModelRecord, key: string): unknown {
  return (record as Record<string, unknown>)[key]
}

function readString(
  record: SerializedModelRecord,
  key: string,
  fallback: string | null = null
): string | null {
  const value = readValue(record, key)
  return typeof value === 'string' ? value : fallback
}

function readNumber(record: SerializedModelRecord, key: string): number | null {
  const value = readValue(record, key)

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function readRecord(record: SerializedModelRecord, key: string): SerializedModelRecord | null {
  const value = readValue(record, key)
  return isSerializedModelRecord(value) ? value : null
}

function normalizeUserResponse(
  user: SerializableModelRecord | SerializedModelRecord,
  options: { includeDerivedFields?: boolean } = {}
): Record<string, unknown> {
  const includeDerivedFields = options.includeDerivedFields ?? true
  const serialized = serializeModelForHttpResponse(user)
  const trustData = readRecord(serialized, 'trust_data')
  const credibilityData = readRecord(serialized, 'credibility_data')
  const currentOrganization = readRecord(serialized, 'current_organization')
  const skills = readValue(serialized, 'skills')
  const normalizedSkills = Array.isArray(skills)
    ? serializeModelCollectionForHttpResponse(skills)
    : skills

  const normalized = {
    ...serialized,
    current_organization:
      currentOrganization &&
      readString(currentOrganization, 'id') &&
      readString(currentOrganization, 'name')
        ? {
            id: readString(currentOrganization, 'id', '') ?? '',
            name: readString(currentOrganization, 'name', '') ?? '',
            slug: readString(currentOrganization, 'slug'),
          }
        : null,
    skills: normalizedSkills,
  }

  if (!includeDerivedFields) {
    return normalized
  }

  return {
    ...normalized,
    status_name:
      readString(serialized, 'status_name', readString(serialized, 'status')) ?? 'member',
    trust_score:
      readNumber(serialized, 'trust_score') ??
      (trustData ? readNumber(trustData, 'calculated_score') : null),
    trust_tier_code:
      readString(serialized, 'trust_tier_code') ??
      (trustData ? readString(trustData, 'current_tier_code') : null),
    credibility_score:
      readNumber(serialized, 'credibility_score') ??
      (credibilityData ? readNumber(credibilityData, 'credibility_score') : null),
  }
}

function normalizeDeliveryMetrics(deliveryMetrics: unknown) {
  if (!isSerializedModelRecord(deliveryMetrics)) {
    return deliveryMetrics
  }

  const skillAggregation = readRecord(deliveryMetrics, 'skill_aggregation')
  if (!skillAggregation) {
    return deliveryMetrics
  }

  return {
    ...deliveryMetrics,
    skill_aggregation: {
      ...skillAggregation,
      avg_percentage: readNumber(skillAggregation, 'avg_percentage'),
    },
  }
}

function mapMetadataOptions(
  items: { name?: string; value?: string; label?: string }[] | undefined
) {
  return (items ?? []).map((item) => {
    const value = item.value ?? item.name ?? ''
    return {
      value,
      label: item.label ?? value,
    }
  })
}

function mapUserMetadata(metadata: UserMetadataShape) {
  return {
    roles: mapMetadataOptions(metadata.roles),
    statuses: mapMetadataOptions(metadata.statuses),
  }
}

function mapUsersListPayload(users: UsersPaginatedResult) {
  return {
    data: users.data
      .filter((user): user is SerializableModelRecord | SerializedModelRecord =>
        isSerializedModelRecord(user)
      )
      .map((user) => normalizeUserResponse(user, { includeDerivedFields: false })),
  }
}

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

export function camelizeResponseValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeResponseValue(item))
  }

  if (isSerializedModelRecord(value)) {
    const output: Record<string, unknown> = {}

    for (const [key, nestedValue] of Object.entries(value)) {
      const camelKey = toCamelCaseKey(key)
      if (typeof nestedValue === 'string' && PROFICIENCY_CODE_KEYS.has(key)) {
        output[camelKey] = getCanonicalProficiencyLevelValue(nestedValue, nestedValue)
        continue
      }
      if (typeof nestedValue === 'string' && PROFICIENCY_CODE_KEYS.has(camelKey)) {
        output[camelKey] = getCanonicalProficiencyLevelValue(nestedValue, nestedValue)
        continue
      }

      output[camelKey] = camelizeResponseValue(nestedValue)
    }

    return output
  }

  return value
}

function mapCanonicalPagination(meta: UsersPaginatedResult['meta']) {
  const normalized = normalizePaginationMeta(meta)

  return toCanonicalApiPagination({
    total: normalized.total,
    perPage: normalized.per_page,
    currentPage: normalized.current_page,
    lastPage: normalized.last_page,
  })
}

export function mapProfileEditPageProps(input: {
  user: SerializableModelRecord | SerializedModelRecord
  completeness: number
  availableSkills: unknown[]
  categories: unknown[]
  proficiencyLevels: unknown[]
  userSkills: unknown[]
}) {
  return {
    user: normalizeUserResponse(input.user),
    completeness: input.completeness,
    availableSkills: input.availableSkills,
    categories: input.categories,
    proficiencyLevels: input.proficiencyLevels,
    userSkills: input.userSkills,
  }
}

export function mapProfileShowPageProps(input: {
  user: SerializableModelRecord | SerializedModelRecord
  userSkills: unknown[]
  completeness: number
  spiderChartData: unknown
  deliveryMetrics: unknown
  featuredReviews: unknown[]
  reviewHistory: unknown
  workHistory: unknown
  currentSnapshot: SerializableModelRecord | SerializedModelRecord | null
}) {
  return {
    user: normalizeUserResponse(input.user),
    userSkills: input.userSkills,
    completeness: input.completeness,
    spiderChartData: input.spiderChartData,
    deliveryMetrics: normalizeDeliveryMetrics(input.deliveryMetrics),
    featuredReviews: input.featuredReviews,
    reviewHistory: input.reviewHistory,
    workHistory: input.workHistory,
    currentSnapshot: serializeCurrentProfileSnapshot(input.currentSnapshot),
  }
}

export function mapProfileSnapshotsPageProps(input: {
  currentSnapshot: SerializableModelRecord | SerializedModelRecord | null
}) {
  return {
    currentSnapshot: serializeCurrentProfileSnapshot(input.currentSnapshot),
  }
}

export function mapProfileViewPageProps(input: {
  user: SerializableModelRecord | SerializedModelRecord
  userSkills: unknown[]
  completeness: number
  spiderChartData: unknown
  deliveryMetrics: unknown
  featuredReviews: unknown[]
  workHistory: unknown
  isOwnProfile: boolean
}) {
  return {
    user: normalizeUserResponse(input.user),
    userSkills: input.userSkills,
    completeness: input.completeness,
    spiderChartData: input.spiderChartData,
    deliveryMetrics: normalizeDeliveryMetrics(input.deliveryMetrics),
    featuredReviews: input.featuredReviews,
    workHistory: input.workHistory,
    isOwnProfile: input.isOwnProfile,
  }
}

export function mapProfileViewApiBody(input: {
  user: SerializableModelRecord | SerializedModelRecord
  userSkills: unknown[]
  completeness: number
  spiderChartData: unknown
  deliveryMetrics: unknown
  featuredReviews: unknown[]
  workHistory: unknown
  isOwnProfile: boolean
}) {
  return {
    data: camelizeResponseValue(mapProfileViewPageProps(input)),
  }
}

export function mapUserMetadataPageProps(metadata: UserMetadataShape) {
  return {
    metadata: mapUserMetadata(metadata),
  }
}

export function mapEditUserPageProps(
  user: SerializableModelRecord | SerializedModelRecord,
  metadata: UserMetadataShape
) {
  return {
    user: normalizeUserResponse(user),
    metadata: mapUserMetadata(metadata),
  }
}

export function mapSuccessMessageApiBody(message: string) {
  return {
    data: {
      message,
    },
  }
}

export function mapCurrentProfileSnapshotApiBody(
  snapshot: SerializableModelRecord | SerializedModelRecord | null
) {
  return {
    data: camelizeResponseValue(serializeCurrentProfileSnapshot(snapshot)),
  }
}

export function mapProfileSnapshotHistoryApiBody(snapshots: unknown[]) {
  return {
    data: camelizeResponseValue(serializeModelCollectionForHttpResponse(snapshots)),
  }
}

export function mapPublicProfileSnapshotApiBody(
  snapshot: SerializableModelRecord | SerializedModelRecord
) {
  return {
    data: camelizeResponseValue(sanitizePublicSnapshot(snapshot)),
  }
}

export function mapPublicProfileSnapshotPageProps(
  snapshot: SerializableModelRecord | SerializedModelRecord
) {
  return {
    snapshot: camelizeResponseValue(sanitizePublicSnapshot(snapshot)),
  }
}

function serializeCurrentProfileSnapshot(
  snapshot: SerializableModelRecord | SerializedModelRecord | null
) {
  const serialized = serializeNullableModelForHttpResponse(snapshot)
  if (!serialized || Array.isArray(serialized)) {
    return serialized
  }

  const isPublic = (serialized as Record<string, unknown>)['is_public'] === true
  return isPublic ? serialized : sanitizePublicSnapshot(serialized)
}

export function mapPendingApprovalUsersPageProps(
  users: UsersPaginatedResult,
  metadata: UserMetadataShape,
  filters: Record<string, unknown>
) {
  const normalized = normalizePaginationMeta(users.meta)

  return {
    users: mapUsersListPayload(users).data,
    pagination: toCanonicalPagePagination({
      total: normalized.total,
      perPage: normalized.per_page,
      currentPage: normalized.current_page,
      lastPage: normalized.last_page,
    }),
    metadata: mapUserMetadata(metadata),
    filters,
  }
}

export function mapSystemUsersApiBody(users: UsersPaginatedResult) {
  const payload = mapUsersListPayload(users)

  return {
    data: camelizeResponseValue(payload.data),
    pagination: mapCanonicalPagination(users.meta),
  }
}

export function mapPendingApprovalUsersApiBody(users: unknown[]) {
  return {
    data: camelizeResponseValue(serializeModelCollectionForHttpResponse(users)),
    pagination: toCanonicalApiPagination({
      total: users.length,
      perPage: users.length,
      currentPage: 1,
      lastPage: 1,
    }),
  }
}

export function mapPendingApprovalCountApiBody(count: number) {
  return {
    data: {
      count,
    },
  }
}

export function mapSnapshotMutationApiBody<T extends object>(result: T) {
  return {
    data: camelizeResponseValue(result),
  }
}

export function mapTalentSearchApiBody(results: unknown[]) {
  return {
    data: camelizeResponseValue(results),
  }
}

export function mapRecruiterBookmarksApiBody(bookmarks: unknown[]) {
  return {
    data: camelizeResponseValue(serializeModelCollectionForHttpResponse(bookmarks)),
  }
}

export function mapRecruiterBookmarkApiBody(
  bookmark: SerializableModelRecord | SerializedModelRecord
) {
  return {
    data: camelizeResponseValue(serializeModelForHttpResponse(bookmark)),
  }
}
