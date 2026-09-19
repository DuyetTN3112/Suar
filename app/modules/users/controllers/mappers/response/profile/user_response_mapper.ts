import type {
  SerializedModelRecord,
  SerializableModelRecord,
} from './model_response_serialization.js'
import {
  sanitizePublicSnapshot,
  serializeModelCollectionForHttpResponse,
  serializeModelForHttpResponse,
} from './model_response_serialization.js'
import type {
  UsersPaginatedResult,
  UserMetadataShape,
} from './user_response_normalization.js'
import {
  camelizeResponseValue,
  mapCanonicalPagination,
  mapUserMetadata,
  mapUsersListPayload,
  normalizeDeliveryMetrics,
  normalizePaginationMeta,
  normalizeUserResponse,
  serializeCurrentProfileSnapshot,
} from './user_response_normalization.js'

import {
  toCanonicalApiPagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'

export * from './user_response_normalization.js'

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
