import type { ResponseRecord, SerializableResponseRecord } from './shared.js'
import { serializeCollectionForResponse, serializeForResponse } from './shared.js'

interface ProjectsIndexResult {
  data: unknown[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: unknown
  stats: unknown
}

export function mapProjectsIndexPageProps(
  result: ProjectsIndexResult,
  showOrganizationRequiredModal: boolean
) {
  return {
    projects: serializeCollectionForResponse(
      result.data as (SerializableResponseRecord | ResponseRecord)[]
    ),
    pagination: result.pagination,
    filters: result.filters,
    stats: result.stats,
    showOrganizationRequiredModal,
  }
}

export function mapProjectDetailPageProps<T extends object>(result: T): T {
  return result
}

export function mapProjectDetailApiBody<T extends object>(result: T): T {
  return result
}

export function mapProjectMutationApiBody(project: SerializableResponseRecord | ResponseRecord) {
  return {
    success: true,
    data: serializeForResponse(project),
  }
}

export function mapDeleteProjectApiBody(message: string) {
  return {
    success: true,
    message,
  }
}

export function mapOrganizationProjectsPageProps<T extends object>(result: T): T {
  return result
}
