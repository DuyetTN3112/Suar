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
} from '../task-authoring/shared.js'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import DeleteTaskDTO from '#modules/tasks/actions/dtos/request/delete_task_dto'
import GetTaskDetailDTO from '#modules/tasks/actions/dtos/request/get_task_detail_dto'
import type {
  CreateTaskAuthoringInput,
  CreateTaskSpecificationAuthoringInput,
  CreateTaskSupportingReferenceInput,
} from '#modules/tasks/actions/dtos/request/task-authoring/create_task_authoring'
import CreateTaskDTO from '#modules/tasks/actions/dtos/request/task-authoring/create_task_dto'
import type { RequiredSkillInput } from '#modules/tasks/actions/dtos/request/task-authoring/create_task_dto_state_builder'
import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import UpdateTaskStatusDTO from '#modules/tasks/actions/dtos/request/update_task_status_dto'
import UpdateTaskTimeDTO from '#modules/tasks/actions/dtos/request/update_task_time_dto'
import type { GetTaskAuditLogsInput } from '#modules/tasks/actions/queries/task-authoring/get_task_audit_logs_query'
import type { GetTasksIndexPageInput } from '#modules/tasks/actions/queries/task-reading/get_tasks_index_page_query'
import {
  createTaskRequestValidator,
  updateTaskRequestValidator,
} from '#modules/tasks/validators/task'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


function readAliasedBodyValue(
  payload: Record<string, unknown>,
  camelKey: string,
  snakeKey: string
): unknown {
  return payload[camelKey] ?? payload[snakeKey]
}

function requireRequestBodyRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw ValidationException.fromIssues([
      validationIssue('body', 'Request body must be an object', 'REQUEST_OBJECT_REQUIRED'),
    ])
  }
  return value as Record<string, unknown>
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
  if (value === undefined) {
    return undefined
  }
  if (!Array.isArray(value)) {
    throw ValidationException.field('requiredSkills', 'requiredSkills must be an array')
  }

  return value.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw ValidationException.field(
        `requiredSkills.${index}`,
        'requiredSkills items must be objects'
      )
    }

    const skill = entry as Record<string, unknown>

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
  assertTaskDoesNotDeclareBusinessDomain(payload)

  const rawRequiredSkills = Object.prototype.hasOwnProperty.call(payload, 'requiredSkills')
    ? payload['requiredSkills']
    : payload['required_skills']

  return {
    ...payload,
    task_status_id: readAliasedBodyValue(payload, 'taskStatusId', 'task_status_id'),
    assigned_to: readAliasedBodyValue(payload, 'assignedTo', 'assigned_to'),
    due_date: readAliasedBodyValue(payload, 'dueDate', 'due_date'),
    parent_task_id: readAliasedBodyValue(payload, 'parentTaskId', 'parent_task_id'),
    estimated_time: readAliasedBodyValue(payload, 'estimatedTime', 'estimated_time'),
    actual_time: readAliasedBodyValue(payload, 'actualTime', 'actual_time'),
    project_id: readAliasedBodyValue(payload, 'projectId', 'project_id'),
    required_skills: normalizeRequiredSkillInput(rawRequiredSkills),
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
    expected_deliverables: readAliasedBodyValue(
      payload,
      'expectedDeliverables',
      'expected_deliverables'
    ),
    measurable_outcomes: readAliasedBodyValue(
      payload,
      'measurableOutcomes',
      'measurable_outcomes'
    ),
  }
}

function assertTaskDoesNotDeclareBusinessDomain(payload: Record<string, unknown>): void {
  const taskLocalDomainKeys = ['businessDomain', 'business_domain', 'domainTags', 'domain_tags']
  const hasTaskLocalDomainValue = taskLocalDomainKeys.some((key) => {
    const value = payload[key]
    if (value === undefined || value === null) return false
    if (Array.isArray(value)) return value.length > 0
    return typeof value !== 'string' || value.trim().length > 0
  })

  if (hasTaskLocalDomainValue) {
    throw new ValidationException(
      'Lĩnh vực của Task được kế thừa từ Project; không được khai báo hoặc sửa riêng trong Task'
    )
  }
}

function normalizeCreateTaskAuthoringInput(value: unknown): CreateTaskAuthoringInput | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw ValidationException.field('authoring', 'authoring must be an object')
  }

  const authoring = value as Record<string, unknown>
  const rawSpecification = authoring['specification']
  const specification =
    typeof rawSpecification === 'object' && rawSpecification !== null && !Array.isArray(rawSpecification)
      ? (rawSpecification as Record<string, unknown>)
      : rawSpecification === undefined
        ? undefined
        : (() => {
            throw ValidationException.field('authoring.specification', 'specification must be an object')
          })()
  const references = readAliasedBodyValue(
    authoring,
    'supportingReferences',
    'supporting_references'
  )
  const supportingReferences = Array.isArray(references)
    ? references.map((entry) => {
        const reference =
          typeof entry === 'object' && entry !== null && !Array.isArray(entry)
            ? (entry as Record<string, unknown>)
            : (() => {
                throw ValidationException.field(
                  'authoring.supportingReferences',
                  'supportingReferences items must be objects'
                )
              })()
        return omitUndefined({
          type: reference['type'],
          uri: reference['uri'],
          title: reference['title'],
          relevant_section: readAliasedBodyValue(
            reference,
            'relevantSection',
            'relevant_section'
          ),
          relation: reference['relation'],
          access_state: readAliasedBodyValue(reference, 'accessState', 'access_state'),
          privacy_classification: readAliasedBodyValue(
            reference,
            'privacyClassification',
            'privacy_classification'
          ),
          external_version: readAliasedBodyValue(
            reference,
            'externalVersion',
            'external_version'
          ),
          external_content_hash: readAliasedBodyValue(
            reference,
            'externalContentHash',
            'external_content_hash'
          ),
        })
      })
    : references === undefined
      ? undefined
      : (() => {
          throw ValidationException.field(
            'authoring.supportingReferences',
            'supportingReferences must be an array'
          )
        })()

  return omitUndefined({
    mode: authoring['mode'],
    intent: authoring['intent'],
    idempotency_key: readAliasedBodyValue(authoring, 'idempotencyKey', 'idempotency_key'),
    expected_head_revision: readAliasedBodyValue(
      authoring,
      'expectedHeadRevision',
      'expected_head_revision'
    ),
    project_context_version_id: readAliasedBodyValue(
      authoring,
      'projectContextVersionId',
      'project_context_version_id'
    ),
    work_package_version_id: readAliasedBodyValue(
      authoring,
      'workPackageVersionId',
      'work_package_version_id'
    ),
    creator_confirmed: readAliasedBodyValue(
      authoring,
      'creatorConfirmed',
      'creator_confirmed'
    ),
    constraints_addressed: readAliasedBodyValue(
      authoring,
      'constraintsAddressed',
      'constraints_addressed'
    ),
    dependencies_addressed: readAliasedBodyValue(
      authoring,
      'dependenciesAddressed',
      'dependencies_addressed'
    ),
    specification: specification
      ? (omitUndefined({
          rich_content: readAliasedBodyValue(specification, 'richContent', 'rich_content'),
          plain_text: readAliasedBodyValue(specification, 'plainText', 'plain_text'),
          sections: specification['sections'],
        }) as CreateTaskSpecificationAuthoringInput)
      : undefined,
    work_contract: readAliasedBodyValue(authoring, 'workContract', 'work_contract'),
    evidence_contract: readAliasedBodyValue(authoring, 'evidenceContract', 'evidence_contract'),
    supporting_references: supportingReferences as
      | readonly CreateTaskSupportingReferenceInput[]
      | undefined,
  }) as CreateTaskAuthoringInput
}

function normalizeUpdateTaskRequestPayload(payload: Record<string, unknown>): Record<string, unknown> {
  assertTaskDoesNotDeclareBusinessDomain(payload)

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
    role_in_task: readAliasedBodyValue(payload, 'roleInTask', 'role_in_task'),
    autonomy_level: readAliasedBodyValue(payload, 'autonomyLevel', 'autonomy_level'),
    problem_category: readAliasedBodyValue(payload, 'problemCategory', 'problem_category'),
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
  const normalizedRequest = normalizeCreateTaskRequestPayload(
    requireRequestBodyRecord(request.body())
  )
  const authoring = normalizeCreateTaskAuthoringInput(normalizedRequest['authoring'])
  if (authoring?.intent === 'save_draft' && normalizedRequest['assigned_to'] !== undefined) {
    throw new ValidationException('Task Draft chưa đủ điều kiện để giao')
  }
  const payload = await createTaskRequestValidator.validate(
    normalizedRequest
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
      normalizedRequest['expected_deliverables'],
      'expected_deliverables'
    ),
    context_background: payload.context_background,
    impact_scope: payload.impact_scope,
    tech_stack: payload.tech_stack,
    environment: payload.environment,
    collaboration_type: payload.collaboration_type,
    complexity_notes: payload.complexity_notes,
    measurable_outcomes: toOptionalRecordArray(
      normalizedRequest['measurable_outcomes'],
      'measurable_outcomes'
    ),
    learning_objectives: payload.learning_objectives,
    domain_tags: payload.domain_tags,
    role_in_task: payload.role_in_task,
    autonomy_level: payload.autonomy_level,
    problem_category: payload.problem_category,
    business_domain: payload.business_domain,
    estimated_users_affected: payload.estimated_users_affected,
    authoring,
  }))
}

export async function buildUpdateTaskDTO(
  request: HttpContext['request'],
  updatedBy: string
): Promise<UpdateTaskDTO> {
  const normalizedPayload = normalizeUpdateTaskRequestPayload(
    requireRequestBodyRecord(request.body())
  )
  const authoring = normalizeCreateTaskAuthoringInput(normalizedPayload['authoring'])
  if (authoring?.intent === 'save_draft' && normalizedPayload['assigned_to'] !== undefined) {
    throw new ValidationException('Task Draft chưa đủ điều kiện để giao')
  }
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
      role_in_task: payload.role_in_task,
      autonomy_level: payload.autonomy_level,
      problem_category: payload.problem_category,
      estimated_users_affected: payload.estimated_users_affected,
      authoring,
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
