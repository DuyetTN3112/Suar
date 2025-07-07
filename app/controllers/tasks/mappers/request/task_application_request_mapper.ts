import type { HttpContext } from '@adonisjs/core/http'

import {
  PAGINATION,
  toApplicationStatusFilter,
  toOptionalNumericValue,
  toOptionalString,
  toOptionalStringArray,
  toPositiveNumber,
  toPublicTaskSortBy,
  toPublicTaskSortOrder,
} from './shared.js'

import {
  ApplyForTaskDTO,
  GetPublicTasksDTO,
  GetTaskApplicationsDTO,
  ProcessApplicationDTO,
} from '#actions/tasks/dtos/request/task_application_dtos'
import type { GetMyApplicationsInput } from '#actions/tasks/queries/get_my_applications_query'
import type { DatabaseId } from '#types/database'
import { applyForTaskRequestValidator, processApplicationRequestValidator } from '#validators/task'


export async function buildApplyForTaskDTO(
  request: HttpContext['request'],
  taskId: DatabaseId
): Promise<ApplyForTaskDTO> {
  const payload = await applyForTaskRequestValidator.validate({
    message: request.input('message') as string | undefined,
    expected_rate: toOptionalNumericValue(request.input('expected_rate') as unknown),
    portfolio_links: request.input('portfolio_links') as string[] | undefined,
    application_source: request.input('application_source', 'public_listing') as string,
  })

  return ApplyForTaskDTO.fromValidatedPayload(payload, taskId)
}

export async function buildProcessApplicationDTO(
  request: HttpContext['request'],
  applicationId: DatabaseId
): Promise<ProcessApplicationDTO> {
  const payload = await processApplicationRequestValidator.validate({
    action: request.input('action') as 'approve' | 'reject',
    rejection_reason: request.input('rejection_reason') as string | undefined,
    assignment_type: request.input('assignment_type', 'freelancer') as string,
    estimated_hours: toOptionalNumericValue(request.input('estimated_hours') as unknown),
  })

  return ProcessApplicationDTO.fromValidatedPayload(payload, applicationId)
}

export function buildGetTaskApplicationsDTO(
  request: HttpContext['request'],
  taskId: DatabaseId
): GetTaskApplicationsDTO {
  return GetTaskApplicationsDTO.forTask(taskId, {
    status: toApplicationStatusFilter(request.input('status', 'all') as unknown),
    page: toPositiveNumber(
      request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
      PAGINATION.DEFAULT_PAGE
    ),
    per_page: toPositiveNumber(
      request.input('per_page', PAGINATION.DEFAULT_PER_PAGE) as unknown,
      PAGINATION.DEFAULT_PER_PAGE
    ),
  })
}

export function buildGetPublicTasksDTO(request: HttpContext['request']): GetPublicTasksDTO {
  return GetPublicTasksDTO.fromFilters({
    page: toPositiveNumber(
      request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
      PAGINATION.DEFAULT_PAGE
    ),
    per_page: toPositiveNumber(
      request.input('per_page', PAGINATION.DEFAULT_PER_PAGE) as unknown,
      PAGINATION.DEFAULT_PER_PAGE
    ),
    skill_ids: toOptionalStringArray(request.input('skill_ids') as unknown) ?? null,
    keyword: toOptionalString(request.input('keyword') as unknown) ?? null,
    difficulty: toOptionalString(request.input('difficulty') as unknown) ?? null,
    min_budget: toOptionalNumericValue(request.input('min_budget') as unknown) ?? null,
    max_budget: toOptionalNumericValue(request.input('max_budget') as unknown) ?? null,
    sort_by: toPublicTaskSortBy(request.input('sort_by', 'created_at') as unknown),
    sort_order: toPublicTaskSortOrder(request.input('sort_order', 'desc') as unknown),
  })
}

export function buildGetMyApplicationsInput(
  request: HttpContext['request']
): GetMyApplicationsInput {
  return {
    status: toApplicationStatusFilter(request.input('status', 'all') as unknown),
    page: toPositiveNumber(
      request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
      PAGINATION.DEFAULT_PAGE
    ),
    per_page: toPositiveNumber(
      request.input('per_page', PAGINATION.DEFAULT_PER_PAGE) as unknown,
      PAGINATION.DEFAULT_PER_PAGE
    ),
  }
}
