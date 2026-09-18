import type { HttpContext } from '@adonisjs/core/http'

import {
  PAGINATION,
  TASKS_DEFAULT_LIMIT,
  toOptionalNullableString,
  toOptionalNumericValue,
  toOptionalString,
  toOptionalStringArray,
  toSortOrder,
  toTaskSortBy,
} from '../task-authoring/shared.js'
import { omitUndefined } from '../task-authoring/task_authoring_request_mapper.js'

import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import GetTaskDetailDTO from '#modules/tasks/actions/dtos/request/get_task_detail_dto'
import UpdateTaskStatusDTO from '#modules/tasks/actions/dtos/request/update_task_status_dto'
import UpdateTaskTimeDTO from '#modules/tasks/actions/dtos/request/update_task_time_dto'
import type { GetTaskAuditLogsInput } from '#modules/tasks/actions/queries/task-authoring/get_task_audit_logs_query'
import type { GetTasksIndexPageInput } from '#modules/tasks/actions/queries/task-reading/get_tasks_index_page_query'

// Re-export authoring mappers and helpers for backward compatibility
export {
  assertTaskDoesNotDeclareBusinessDomain,
  buildCreateTaskDTO,
  buildDeleteTaskDTO,
  buildUpdateTaskDTO,
  normalizeCreateTaskAuthoringInput,
  normalizeCreateTaskRequestPayload,
  normalizeRequiredSkillInput,
  normalizeUpdateTaskRequestPayload,
  omitUndefined,
  readAliasedBodyValue,
  requireRequestBodyRecord,
} from '../task-authoring/task_authoring_request_mapper.js'

function readAliasedInput(
  request: HttpContext['request'],
  camelKey: string,
  snakeKey: string,
  fallback?: unknown
): unknown {
  return request.input(camelKey, request.input(snakeKey, fallback))
}

export function buildGetTasksIndexPageInput(
  request: HttpContext['request'],
  organizationId: string,
  defaultLimit: number = TASKS_DEFAULT_LIMIT
): GetTasksIndexPageInput {
  const pagination = normalizePagination(
    {
      page: request.input('page', PAGINATION.DEFAULT_PAGE),
      limit: request.input('limit', defaultLimit),
    },
    PAGINATION,
    { perPage: defaultLimit }
  )

  return omitUndefined({
    page: pagination.page,
    limit: pagination.perPage,
    task_status_id: toOptionalStringArray(
      readAliasedInput(request, 'taskStatusId', 'task_status_id') ?? request.input('status')
    ),
    priority: toOptionalStringArray(request.input('priority') as unknown),
    label: toOptionalStringArray(request.input('label') as unknown),
    assigned_to: toOptionalStringArray(readAliasedInput(request, 'assignedTo', 'assigned_to')),
    parent_task_id: toOptionalNullableString(
      readAliasedInput(request, 'parentTaskId', 'parent_task_id')
    ),
    requested_project_id: toOptionalString(
      readAliasedInput(request, 'projectId', 'project_id')
    ),
    search: toOptionalString(request.input('search') as unknown),
    organization_id: organizationId,
    sort_by: toTaskSortBy(readAliasedInput(request, 'sortBy', 'sort_by', 'due_date')),
    sort_order: toSortOrder(readAliasedInput(request, 'sortOrder', 'sort_order', 'asc')),
    created_at_start: toOptionalString(readAliasedInput(request, 'createdAtStart', 'created_at_start')),
    created_at_end: toOptionalString(readAliasedInput(request, 'createdAtEnd', 'created_at_end')),
    due_date_start: toOptionalString(readAliasedInput(request, 'dueDateStart', 'due_date_start')),
    due_date_end: toOptionalString(readAliasedInput(request, 'dueDateEnd', 'due_date_end')),
  })
}

export function buildUpdateTaskStatusDTO(
  request: HttpContext['request'],
  taskId: string
): UpdateTaskStatusDTO {
  return new UpdateTaskStatusDTO(omitUndefined({
    task_id: taskId,
    task_status_id: (request.input('taskStatusId') ??
      request.input('task_status_id')) as string,
    reason: request.input('reason') as string | undefined,
  }))
}

export function buildUpdateTaskTimeDTO(
  request: HttpContext['request'],
  taskId: string
): UpdateTaskTimeDTO {
  return new UpdateTaskTimeDTO(omitUndefined({
    task_id: taskId,
    estimated_time: toOptionalNumericValue(request.input('estimated_time') as unknown),
    actual_time: toOptionalNumericValue(request.input('actual_time') as unknown),
  }))
}

export function buildGetTaskAuditLogsInput(
  request: HttpContext['request'],
  taskId: string
): GetTaskAuditLogsInput {
  const pagination = normalizePagination(
    {
      limit: request.input('limit', PAGINATION.DEFAULT_PER_PAGE),
    },
    PAGINATION
  )

  return {
    taskId,
    limit: pagination.perPage,
  }
}

export function buildGetTaskDetailDTO(
  taskId: string,
  surface: 'project' | 'marketplace' = 'project'
): GetTaskDetailDTO {
  return GetTaskDetailDTO.createFull(taskId, surface)
}
