import type { HttpContext } from '@adonisjs/core/http'

import {
  PAGINATION,
  TASKS_DEFAULT_LIMIT,
  toOptionalNullableString,
  toOptionalNumericValue,
  toOptionalRecordArray,
  toOptionalString,
  toOptionalStringArray,
  toSortOrder,
  toTaskSortBy,
} from './shared.js'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import type { PatchTaskStatusBoardPocInput } from '#modules/tasks/actions/commands/patch_task_status_board_poc_command'
import CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import type { RequiredSkillInput } from '#modules/tasks/actions/dtos/request/create_task_dto_state_builder'
import DeleteTaskDTO from '#modules/tasks/actions/dtos/request/delete_task_dto'
import GetTaskDetailDTO from '#modules/tasks/actions/dtos/request/get_task_detail_dto'
import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import UpdateTaskStatusDTO from '#modules/tasks/actions/dtos/request/update_task_status_dto'
import UpdateTaskTimeDTO from '#modules/tasks/actions/dtos/request/update_task_time_dto'
import type { GetTaskAuditLogsInput } from '#modules/tasks/actions/queries/get_task_audit_logs_query'
import type { GetTasksIndexPageInput } from '#modules/tasks/actions/queries/get_tasks_index_page_query'
import {
  createTaskRequestValidator,
  updateTaskRequestValidator,
} from '#modules/tasks/validators/task'

function readAliasedBodyValue(
  payload: Record<string, unknown>,
  camelKey: string,
  snakeKey: string
): unknown {
  return payload[camelKey] ?? payload[snakeKey]
}

function readAliasedInput(
  request: HttpContext['request'],
  camelKey: string,
  snakeKey: string,
  fallback?: unknown
): unknown {
  return request.input(camelKey, request.input(snakeKey, fallback))
}

function normalizeRequiredSkillInput(value: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value.map((entry) => {
    const skill = (entry ?? {}) as Record<string, unknown>

    return omitUndefined({
      id: skill['id'],
      level: skill['level'],
      custom_name: readAliasedBodyValue(skill, 'customName', 'custom_name'),
      category_code: readAliasedBodyValue(skill, 'categoryCode', 'category_code'),
      project_skill_id: readAliasedBodyValue(skill, 'projectSkillId', 'project_skill_id'),
      source_project_professional_role_id: readAliasedBodyValue(
        skill,
        'sourceProjectProfessionalRoleId',
        'source_project_professional_role_id'
      ),
      source_role_skill_id: readAliasedBodyValue(skill, 'sourceRoleSkillId', 'source_role_skill_id'),
      minimum_level_id: readAliasedBodyValue(skill, 'minimumLevelId', 'minimum_level_id'),
      target_level_id: readAliasedBodyValue(skill, 'targetLevelId', 'target_level_id'),
      assessment_ceiling_level_id: readAliasedBodyValue(
        skill,
        'assessmentCeilingLevelId',
        'assessment_ceiling_level_id'
      ),
      rubric_version_id: readAliasedBodyValue(skill, 'rubricVersionId', 'rubric_version_id'),
      importance: skill['importance'],
      weight: skill['weight'],
      requirement_source: readAliasedBodyValue(skill, 'requirementSource', 'requirement_source'),
      requirement_notes: readAliasedBodyValue(skill, 'requirementNotes', 'requirement_notes'),
      is_mandatory: readAliasedBodyValue(skill, 'isMandatory', 'is_mandatory'),
    })
  })
}

function normalizeCreateTaskRequestPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    ...payload,
    task_status_id: readAliasedBodyValue(payload, 'taskStatusId', 'task_status_id'),
    assigned_to: readAliasedBodyValue(payload, 'assignedTo', 'assigned_to'),
    due_date: readAliasedBodyValue(payload, 'dueDate', 'due_date'),
    parent_task_id: readAliasedBodyValue(payload, 'parentTaskId', 'parent_task_id'),
    estimated_time: readAliasedBodyValue(payload, 'estimatedTime', 'estimated_time'),
    actual_time: readAliasedBodyValue(payload, 'actualTime', 'actual_time'),
    project_id: readAliasedBodyValue(payload, 'projectId', 'project_id'),
    required_skills: normalizeRequiredSkillInput(
      readAliasedBodyValue(payload, 'requiredSkills', 'required_skills')
    ),
    task_type: readAliasedBodyValue(payload, 'taskType', 'task_type'),
    task_visibility: readAliasedBodyValue(payload, 'taskVisibility', 'task_visibility'),
    acceptance_criteria: readAliasedBodyValue(payload, 'acceptanceCriteria', 'acceptance_criteria'),
    verification_method: readAliasedBodyValue(payload, 'verificationMethod', 'verification_method'),
    context_background: readAliasedBodyValue(payload, 'contextBackground', 'context_background'),
    impact_scope: readAliasedBodyValue(payload, 'impactScope', 'impact_scope'),
    tech_stack: readAliasedBodyValue(payload, 'techStack', 'tech_stack'),
    collaboration_type: readAliasedBodyValue(payload, 'collaborationType', 'collaboration_type'),
    complexity_notes: readAliasedBodyValue(payload, 'complexityNotes', 'complexity_notes'),
    learning_objectives: readAliasedBodyValue(payload, 'learningObjectives', 'learning_objectives'),
    domain_tags: readAliasedBodyValue(payload, 'domainTags', 'domain_tags'),
    role_in_task: readAliasedBodyValue(payload, 'roleInTask', 'role_in_task'),
    autonomy_level: readAliasedBodyValue(payload, 'autonomyLevel', 'autonomy_level'),
    problem_category: readAliasedBodyValue(payload, 'problemCategory', 'problem_category'),
    business_domain: readAliasedBodyValue(payload, 'businessDomain', 'business_domain'),
    estimated_users_affected: readAliasedBodyValue(
      payload,
      'estimatedUsersAffected',
      'estimated_users_affected'
    ),
  }
}

function normalizeUpdateTaskRequestPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    ...payload,
    assigned_to: readAliasedBodyValue(payload, 'assignedTo', 'assigned_to'),
    due_date: readAliasedBodyValue(payload, 'dueDate', 'due_date'),
    parent_task_id: readAliasedBodyValue(payload, 'parentTaskId', 'parent_task_id'),
    estimated_time: readAliasedBodyValue(payload, 'estimatedTime', 'estimated_time'),
    actual_time: readAliasedBodyValue(payload, 'actualTime', 'actual_time'),
    project_id: readAliasedBodyValue(payload, 'projectId', 'project_id'),
    expected_updated_at: readAliasedBodyValue(payload, 'expectedUpdatedAt', 'expected_updated_at'),
    task_type: readAliasedBodyValue(payload, 'taskType', 'task_type'),
    task_visibility: readAliasedBodyValue(payload, 'taskVisibility', 'task_visibility'),
    acceptance_criteria: readAliasedBodyValue(payload, 'acceptanceCriteria', 'acceptance_criteria'),
    verification_method: readAliasedBodyValue(payload, 'verificationMethod', 'verification_method'),
    context_background: readAliasedBodyValue(payload, 'contextBackground', 'context_background'),
    impact_scope: readAliasedBodyValue(payload, 'impactScope', 'impact_scope'),
    tech_stack: readAliasedBodyValue(payload, 'techStack', 'tech_stack'),
    collaboration_type: readAliasedBodyValue(payload, 'collaborationType', 'collaboration_type'),
    complexity_notes: readAliasedBodyValue(payload, 'complexityNotes', 'complexity_notes'),
    learning_objectives: readAliasedBodyValue(payload, 'learningObjectives', 'learning_objectives'),
    domain_tags: readAliasedBodyValue(payload, 'domainTags', 'domain_tags'),
    role_in_task: readAliasedBodyValue(payload, 'roleInTask', 'role_in_task'),
    autonomy_level: readAliasedBodyValue(payload, 'autonomyLevel', 'autonomy_level'),
    problem_category: readAliasedBodyValue(payload, 'problemCategory', 'problem_category'),
    business_domain: readAliasedBodyValue(payload, 'businessDomain', 'business_domain'),
    estimated_users_affected: readAliasedBodyValue(
      payload,
      'estimatedUsersAffected',
      'estimated_users_affected'
    ),
  }
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

export async function buildCreateTaskDTO(
  request: HttpContext['request'],
  organizationId: string
): Promise<CreateTaskDTO> {
  const payload = await createTaskRequestValidator.validate(
    normalizeCreateTaskRequestPayload(request.body() as Record<string, unknown>)
  )
  const requiredSkills: RequiredSkillInput[] = (payload.required_skills ?? []).map((skill) =>
    omitUndefined(skill)
  )

  return new CreateTaskDTO(omitUndefined({
    title: payload.title,
    description: payload.description,
    task_status_id: payload.task_status_id,
    label: payload.label,
    priority: payload.priority,
    task_visibility: payload.task_visibility,
    assigned_to: payload.assigned_to,
    due_date: payload.due_date,
    parent_task_id: payload.parent_task_id,
    estimated_time: payload.estimated_time,
    actual_time: payload.actual_time,
    project_id: payload.project_id,
    organization_id: organizationId,
    required_skills: requiredSkills,
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
  }))
}

export async function buildUpdateTaskDTO(
  request: HttpContext['request'],
  updatedBy: string
): Promise<UpdateTaskDTO> {
  const normalizedPayload = normalizeUpdateTaskRequestPayload(
    request.body() as Record<string, unknown>
  )
  const payload = await updateTaskRequestValidator.validate(normalizedPayload)

  return UpdateTaskDTO.fromValidatedPayload(
    omitUndefined({
      title: payload.title,
      description: payload.description,
      label: payload.label,
      priority: payload.priority,
      task_visibility: payload.task_visibility,
      assigned_to: payload.assigned_to,
      due_date: payload.due_date,
      parent_task_id: payload.parent_task_id,
      estimated_time: payload.estimated_time,
      actual_time: payload.actual_time,
      project_id: payload.project_id,
      expected_updated_at: payload.expected_updated_at,
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
    }),
    updatedBy
  )
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

export function buildDeleteTaskDTO(
  request: HttpContext['request'],
  taskId: string
): DeleteTaskDTO {
  return new DeleteTaskDTO(omitUndefined({
    task_id: taskId,
    reason: request.input('reason') as string | undefined,
    permanent: request.input('permanent', false) as boolean,
  }))
}

export function buildPatchTaskStatusBoardPocInput(
  request: HttpContext['request'],
  organizationId: string
): PatchTaskStatusBoardPocInput {
  return omitUndefined({
    organizationId,
    total: toOptionalNumericValue(request.input('total') as unknown),
    simulateConflict: (request.input('simulateConflict') ??
      request.input('simulate_conflict', false)) as boolean,
  })
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

export function buildGetTaskDetailDTO(taskId: string): GetTaskDetailDTO {
  return GetTaskDetailDTO.createFull(taskId)
}
