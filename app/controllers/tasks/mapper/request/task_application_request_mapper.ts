import type { HttpContext } from '@adonisjs/core/http'
import type { DatabaseId } from '#types/database'
import type { GetMyApplicationsInput } from '#actions/tasks/queries/get_my_applications_query'
import type {
  ApplyForTaskDTO,
  ProcessApplicationDTO,
} from '#actions/tasks/dtos/request/task_application_dtos'
import { ApplyForTaskDTO as ApplyForTaskDTOClass } from '#actions/tasks/dtos/request/task_application_dtos'
import { ProcessApplicationDTO as ProcessApplicationDTOClass } from '#actions/tasks/dtos/request/task_application_dtos'
import {
  GetPublicTasksDTO,
  GetTaskApplicationsDTO,
} from '#actions/tasks/dtos/request/task_application_dtos'
import { applyForTaskRequestValidator, processApplicationRequestValidator } from '#validators/task'
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

  return new ApplyForTaskDTOClass({
    task_id: taskId,
    message: payload.message,
    expected_rate: payload.expected_rate,
    portfolio_links: payload.portfolio_links,
    application_source: payload.application_source,
  })
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

  return new ProcessApplicationDTOClass({
    application_id: applicationId,
    action: payload.action,
    rejection_reason: payload.rejection_reason,
    assignment_type: payload.assignment_type,
    estimated_hours: payload.estimated_hours,
  })
}

export function buildGetTaskApplicationsDTO(
  request: HttpContext['request'],
  taskId: DatabaseId
): GetTaskApplicationsDTO {
  return new GetTaskApplicationsDTO({
    task_id: taskId,
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
  return new GetPublicTasksDTO({
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
