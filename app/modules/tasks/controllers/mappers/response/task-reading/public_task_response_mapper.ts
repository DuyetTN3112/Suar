import type { PaginationMeta, SerializedModelRecord, SerializableModelRecord } from './model_response_serialization.js'
import { serializeModelCollectionForHttpResponse } from './model_response_serialization.js'

import {
  fromLegacySnakePagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'

interface PublicTaskControllerResult {
  data: (SerializableModelRecord | SerializedModelRecord)[]
  meta: PaginationMeta
}

export interface PublicTaskFiltersResponse {
  skill_ids: string[] | null
  keyword: string | null
  difficulty: string | null
  sort_by: string
  sort_order: string
}

export function mapPublicTaskCollectionResponse(
  tasks: (SerializableModelRecord | SerializedModelRecord)[]
): SerializedModelRecord[] {
  return serializeModelCollectionForHttpResponse(tasks)
}

export function mapPublicTasksPageProps(
  result: PublicTaskControllerResult,
  filters: PublicTaskFiltersResponse
) {
  return {
    tasks: mapPublicTaskCollectionResponse(result.data),
    pagination: toCanonicalPagePagination(fromLegacySnakePagination(result.meta)),
    filters: {
      skill_ids: filters.skill_ids,
      keyword: filters.keyword,
      difficulty: filters.difficulty,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
    },
  }
}

export function mapPublicTasksApiBody(result: PublicTaskControllerResult) {
  return {
    data: mapPublicTaskCollectionResponse(result.data),
    pagination: {
      page: result.meta.current_page,
      perPage: result.meta.per_page,
      total: result.meta.total,
      hasNextPage: result.meta.current_page < result.meta.last_page,
      hasPreviousPage: result.meta.current_page > 1,
    },
  }
}
