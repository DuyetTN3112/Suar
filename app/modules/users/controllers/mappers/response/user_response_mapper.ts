import type { ResponseRecord, SerializableResponseRecord } from './shared.js'
import {
  normalizePaginationMeta,
  sanitizePublicSnapshot,
  serializeCollectionForResponse,
  serializeForResponse,
  serializeNullableForResponse,
} from './shared.js'

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

function isResponseRecord(value: unknown): value is ResponseRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readValue(record: ResponseRecord, key: string): unknown {
  return (record as Record<string, unknown>)[key]
}

function readString(
  record: ResponseRecord,
  key: string,
  fallback: string | null = null
): string | null {
  const value = readValue(record, key)
  return typeof value === 'string' ? value : fallback
}

function readNumber(record: ResponseRecord, key: string): number | null {
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

function readRecord(record: ResponseRecord, key: string): ResponseRecord | null {
  const value = readValue(record, key)
  return isResponseRecord(value) ? value : null
}

function normalizeUserResponse(
  user: SerializableResponseRecord | ResponseRecord,
  options: { includeDerivedFields?: boolean } = {}
): Record<string, unknown> {
  const includeDerivedFields = options.includeDerivedFields ?? true
  const serialized = serializeForResponse(user)
  const trustData = readRecord(serialized, 'trust_data')
  const credibilityData = readRecord(serialized, 'credibility_data')
  const currentOrganization = readRecord(serialized, 'current_organization')
  const skills = readValue(serialized, 'skills')
  const normalizedSkills = Array.isArray(skills) ? serializeCollectionForResponse(skills) : skills

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
  if (!isResponseRecord(deliveryMetrics)) {
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
      avg_percentage: readNumber(skillAggregation, 'avg_percentage') ?? 0,
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
      .filter((user): user is SerializableResponseRecord | ResponseRecord => isResponseRecord(user))
      .map((user) => normalizeUserResponse(user, { includeDerivedFields: false })),
    meta: normalizePaginationMeta(users.meta),
  }
}

export function mapProfileEditPageProps(input: {
  user: SerializableResponseRecord | ResponseRecord
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
  user: SerializableResponseRecord | ResponseRecord
  completeness: number
  spiderChartData: unknown
  deliveryMetrics: unknown
  featuredReviews: unknown[]
  currentSnapshot: SerializableResponseRecord | ResponseRecord | null
}) {
  return {
    user: normalizeUserResponse(input.user),
    completeness: input.completeness,
    spiderChartData: input.spiderChartData,
    deliveryMetrics: normalizeDeliveryMetrics(input.deliveryMetrics),
    featuredReviews: input.featuredReviews,
    currentSnapshot: serializeNullableForResponse(input.currentSnapshot),
  }
}

export function mapProfileViewPageProps(input: {
  user: SerializableResponseRecord | ResponseRecord
  completeness: number
  spiderChartData: unknown
  deliveryMetrics: unknown
  featuredReviews: unknown[]
  isOwnProfile: boolean
}) {
  return {
    user: normalizeUserResponse(input.user),
    completeness: input.completeness,
    spiderChartData: input.spiderChartData,
    deliveryMetrics: normalizeDeliveryMetrics(input.deliveryMetrics),
    featuredReviews: input.featuredReviews,
    isOwnProfile: input.isOwnProfile,
  }
}

export function mapUserMetadataPageProps(metadata: UserMetadataShape) {
  return {
    metadata: mapUserMetadata(metadata),
  }
}

export function mapEditUserPageProps(
  user: SerializableResponseRecord | ResponseRecord,
  metadata: UserMetadataShape
) {
  return {
    user: normalizeUserResponse(user),
    metadata: mapUserMetadata(metadata),
  }
}

export function mapShowUserPageProps(user: SerializableResponseRecord | ResponseRecord) {
  return {
    user: normalizeUserResponse(user),
  }
}

export function mapSuccessMessageApiBody(message: string) {
  return {
    success: true,
    message,
  }
}

export function mapCurrentProfileSnapshotApiBody(
  snapshot: SerializableResponseRecord | ResponseRecord | null
) {
  return {
    success: true,
    data: serializeNullableForResponse(snapshot),
  }
}

export function mapProfileSnapshotHistoryApiBody(snapshots: unknown[]) {
  return {
    success: true,
    data: serializeCollectionForResponse(snapshots),
  }
}

export function mapPublicProfileSnapshotApiBody(
  snapshot: SerializableResponseRecord | ResponseRecord
) {
  return {
    success: true,
    data: sanitizePublicSnapshot(snapshot),
  }
}

export function mapUsersIndexPageProps(
  users: UsersPaginatedResult,
  metadata: UserMetadataShape,
  filters: Record<string, unknown>
) {
  return {
    users: mapUsersListPayload(users),
    metadata: mapUserMetadata(metadata),
    filters,
  }
}

export function mapPendingApprovalUsersPageProps(
  users: UsersPaginatedResult,
  metadata: UserMetadataShape,
  filters: Record<string, unknown>
) {
  return {
    users: mapUsersListPayload(users),
    metadata: mapUserMetadata(metadata),
    filters,
  }
}

export function mapSystemUsersApiBody(users: UsersPaginatedResult) {
  return {
    success: true,
    users: mapUsersListPayload(users),
  }
}

export function mapPendingApprovalUsersApiBody(users: unknown[]) {
  return {
    success: true,
    users: serializeCollectionForResponse(users),
    meta: {
      total: users.length,
      per_page: users.length,
      current_page: 1,
      last_page: 1,
    },
  }
}

export function mapPendingApprovalCountApiBody(count: number) {
  return {
    success: true,
    count,
  }
}

export function mapSnapshotMutationApiBody<T extends object>(result: T) {
  return {
    success: true,
    data: result,
  }
}
