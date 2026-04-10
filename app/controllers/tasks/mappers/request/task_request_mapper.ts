import type { HttpContext } from '@adonisjs/core/http'
import type { DatabaseId } from '#types/database'
import CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import DeleteTaskDTO from '#actions/tasks/dtos/request/delete_task_dto'
import GetTaskDetailDTO from '#actions/tasks/dtos/request/get_task_detail_dto'
import UpdateTaskDTO from '#actions/tasks/dtos/request/update_task_dto'
import UpdateTaskStatusDTO from '#actions/tasks/dtos/request/update_task_status_dto'
import UpdateTaskTimeDTO from '#actions/tasks/dtos/request/update_task_time_dto'
import type { PatchTaskStatusBoardPocInput } from '#actions/tasks/commands/patch_task_status_board_poc_command'
import type { GetTaskAuditLogsInput } from '#actions/tasks/queries/get_task_audit_logs_query'
import type { GetTasksIndexPageInput } from '#actions/tasks/queries/get_tasks_index_page_query'
import { createTaskRequestValidator, updateTaskRequestValidator } from '#validators/task'
import {
  PAGINATION,
  TASKS_DEFAULT_LIMIT,
  toOptionalNullableString,
  toOptionalNumericValue,
  toOptionalRecordArray,
  toOptionalString,
  toPositiveNumber,
  toSortOrder,
  toTaskSortBy,
} from './shared.js'

export function buildGetTasksIndexPageInput(
  request: HttpContext['request'],
  organizationId: DatabaseId,
  defaultLimit: number = TASKS_DEFAULT_LIMIT
): GetTasksIndexPageInput {
  return {
    page: toPositiveNumber(
      request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
      PAGINATION.DEFAULT_PAGE
    ),
    limit: toPositiveNumber(request.input('limit', defaultLimit) as unknown, defaultLimit),
    task_status_id: toOptionalString(
      (request.input('task_status_id') ?? request.input('status')) as unknown
    ),
    priority: toOptionalString(request.input('priority') as unknown),
    label: toOptionalString(request.input('label') as unknown),
    assigned_to: toOptionalString(request.input('assigned_to') as unknown),
    parent_task_id: toOptionalNullableString(request.input('parent_task_id') as unknown),
    requested_project_id: toOptionalString(request.input('project_id') as unknown),
    search: toOptionalString(request.input('search') as unknown),
    organization_id: organizationId,
    sort_by: toTaskSortBy(request.input('sort_by', 'due_date') as unknown),
    sort_order: toSortOrder(request.input('sort_order', 'asc') as unknown),
  }
}

export async function buildCreateTaskDTO(
  request: HttpContext['request'],
  organizationId: DatabaseId
): Promise<CreateTaskDTO> {
  const payload = await createTaskRequestValidator.validate(request.body())

  return new CreateTaskDTO({
    title: payload.title,
    description: payload.description,
    task_status_id: payload.task_status_id,
    label: payload.label,
    priority: payload.priority,
    assigned_to: payload.assigned_to,
    due_date: payload.due_date,
    parent_task_id: payload.parent_task_id,
    estimated_time: payload.estimated_time,
    actual_time: payload.actual_time,
    project_id: payload.project_id,
    organization_id: organizationId,
    required_skills: payload.required_skills,
    task_type: payload.task_type,
    acceptance_criteria: payload.acceptance_criteria,
    verification_method: payload.verification_method,
    expected_deliverables: toOptionalRecordArray(
      request.input('expected_deliverables') as unknown,
      'expected_deliverables'
    ),
    context_background: payload.context_background,
    impact_scope: payload.impact_scope,
    tech_stack: payload.tech_stack,
    environment: payload.environment,
    collaboration_type: payload.collaboration_type,
    complexity_notes: payload.complexity_notes,
    measurable_outcomes: toOptionalRecordArray(
      request.input('measurable_outcomes') as unknown,
      'measurable_outcomes'
    ),
    learning_objectives: payload.learning_objectives,
    domain_tags: payload.domain_tags,
    role_in_task: payload.role_in_task,
    autonomy_level: payload.autonomy_level,
    problem_category: payload.problem_category,
    business_domain: payload.business_domain,
    estimated_users_affected: payload.estimated_users_affected,
  })
}

export async function buildUpdateTaskDTO(
  request: HttpContext['request'],
  updatedBy: DatabaseId
): Promise<UpdateTaskDTO> {
  const payload = await updateTaskRequestValidator.validate(request.body())

  return UpdateTaskDTO.fromValidatedPayload(
    {
      title: payload.title,
      description: payload.description,
      label: payload.label,
      priority: payload.priority,
      assigned_to: payload.assigned_to,
      due_date: payload.due_date,
      parent_task_id: payload.parent_task_id,
      estimated_time: payload.estimated_time,
      actual_time: payload.actual_time,
      project_id: payload.project_id,
    },
    updatedBy
  )
}

export function buildUpdateTaskStatusDTO(
  request: HttpContext['request'],
  taskId: DatabaseId
): UpdateTaskStatusDTO {
  return new UpdateTaskStatusDTO({
    task_id: taskId,
    task_status_id: request.input('task_status_id') as string,
    reason: request.input('reason') as string | undefined,
  })
}

export function buildUpdateTaskTimeDTO(
  request: HttpContext['request'],
  taskId: DatabaseId
): UpdateTaskTimeDTO {
  return new UpdateTaskTimeDTO({
    task_id: taskId,
    estimated_time: toOptionalNumericValue(request.input('estimated_time') as unknown),
    actual_time: toOptionalNumericValue(request.input('actual_time') as unknown),
  })
}

export function buildDeleteTaskDTO(
  request: HttpContext['request'],
  taskId: DatabaseId
): DeleteTaskDTO {
  return new DeleteTaskDTO({
    task_id: taskId,
    reason: request.input('reason') as string | undefined,
    permanent: request.input('permanent', false) as boolean,
  })
}

export function buildPatchTaskStatusBoardPocInput(
  request: HttpContext['request'],
  organizationId: DatabaseId
): PatchTaskStatusBoardPocInput {
  return {
    organizationId,
    total: toOptionalNumericValue(request.input('total') as unknown),
    simulateConflict: request.input('simulate_conflict', false) as boolean,
  }
}

export function buildGetTaskAuditLogsInput(
  request: HttpContext['request'],
  taskId: DatabaseId
): GetTaskAuditLogsInput {
  return {
    taskId,
    limit: toPositiveNumber(
      request.input('limit', PAGINATION.DEFAULT_PER_PAGE) as unknown,
      PAGINATION.DEFAULT_PER_PAGE
    ),
  }
}

export function buildGetTaskDetailDTO(taskId: DatabaseId): GetTaskDetailDTO {
  return GetTaskDetailDTO.createFull(taskId)
}
