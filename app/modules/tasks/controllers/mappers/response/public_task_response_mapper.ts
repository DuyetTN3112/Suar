import type { PaginationMeta, ResponseRecord, SerializableResponseRecord } from './shared.js'
import { serializeCollectionForResponse } from './shared.js'

interface PublicTaskControllerResult {
  data: (SerializableResponseRecord | ResponseRecord)[]
  meta: PaginationMeta
}

export interface PublicTaskFiltersResponse {
  skill_ids: string[] | null
  keyword: string | null
  difficulty: string | null
  min_budget: number | null
  max_budget: number | null
  sort_by: string
  sort_order: string
}

export function mapPublicTaskCollectionResponse(
  tasks: (SerializableResponseRecord | ResponseRecord)[]
): ResponseRecord[] {
  return serializeCollectionForResponse(tasks)
}

export function mapPublicTasksPageProps(
  result: PublicTaskControllerResult,
  filters: PublicTaskFiltersResponse
) {
  return {
    tasks: mapPublicTaskCollectionResponse(result.data),
    meta: result.meta,
    filters: {
      skill_ids: filters.skill_ids,
      keyword: filters.keyword,
      difficulty: filters.difficulty,
      min_budget: filters.min_budget,
      max_budget: filters.max_budget,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
    },
  }
}

export function mapPublicTasksApiBody(result: PublicTaskControllerResult) {
  return {
    data: mapPublicTaskCollectionResponse(result.data),
    meta: result.meta,
  }
}
