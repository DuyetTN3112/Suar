import type {
  PaginationMeta,
  SerializedModelRecord,
  SerializableModelRecord,
} from './model_response_serialization.js'
import { serializeModelCollectionForHttpResponse } from './model_response_serialization.js'

import type { SubmittedMarketplaceApplication } from '#modules/marketplace/actions/dtos/marketplace_application'
import {
  fromLegacySnakePagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'

interface MarketplaceTaskControllerResult {
  data: (SerializableModelRecord | SerializedModelRecord)[]
  meta: PaginationMeta
}

export interface MarketplaceTaskFiltersResponse {
  skill_categories: string[] | null
  skill_ids: string[] | null
  keyword: string | null
  difficulty: string | null
  task_type: string | null
  business_domain: string | null
  problem_category: string | null
  role_in_task: string | null
  verification_method: string | null
  tech_stack: string | null
  domain_tags: string | null
  accepting_applications: 'open' | 'closed' | null
  sort_by: string
  sort_order: string
}

export function mapApplyMarketplaceTaskApiBody(application: SubmittedMarketplaceApplication) {
  return {
    data: {
      id: application.id,
      taskId: application.taskId,
      applicantId: application.applicantId,
      message: application.message,
      portfolioLinks: application.portfolioLinks ? [...application.portfolioLinks] : null,
      applicationSource: application.applicationSource,
    },
  }
}

export function mapMarketplaceTaskCollectionResponse(
  tasks: (SerializableModelRecord | SerializedModelRecord)[]
): SerializedModelRecord[] {
  return serializeModelCollectionForHttpResponse(tasks)
}

export function mapMarketplaceTasksPageProps(
  result: MarketplaceTaskControllerResult,
  filters: MarketplaceTaskFiltersResponse
) {
  return {
    tasks: mapMarketplaceTaskCollectionResponse(result.data),
    pagination: toCanonicalPagePagination(fromLegacySnakePagination(result.meta)),
    filters: {
      skill_categories: filters.skill_categories,
      skill_ids: filters.skill_ids,
      keyword: filters.keyword,
      difficulty: filters.difficulty,
      task_type: filters.task_type,
      business_domain: filters.business_domain,
      problem_category: filters.problem_category,
      role_in_task: filters.role_in_task,
      verification_method: filters.verification_method,
      tech_stack: filters.tech_stack,
      domain_tags: filters.domain_tags,
      accepting_applications: filters.accepting_applications,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
    },
  }
}

export function mapMarketplaceTasksApiBody(result: MarketplaceTaskControllerResult) {
  return {
    data: mapMarketplaceTaskCollectionResponse(result.data),
    pagination: {
      page: result.meta.current_page,
      perPage: result.meta.per_page,
      total: result.meta.total,
      hasNextPage: result.meta.current_page < result.meta.last_page,
      hasPreviousPage: result.meta.current_page > 1,
    },
  }
}
