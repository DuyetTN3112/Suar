import type { HttpContext } from '@adonisjs/core/http'

import {
  toOptionalRecordArray,
} from './shared.js'
import {
  normalizeCreateTaskAuthoringInput,
  omitUndefined,
  readAliasedBodyValue,
} from './task_authoring_contract_input_mapper.js'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'
import DeleteTaskDTO from '#modules/tasks/actions/dtos/request/delete_task_dto'
import CreateTaskDTO from '#modules/tasks/actions/dtos/request/task-authoring/create_task_dto'
import type { RequiredSkillInput } from '#modules/tasks/actions/dtos/request/task-authoring/create_task_dto_state_builder'
import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import {
  createTaskRequestValidator,
  updateTaskRequestValidator,
} from '#modules/tasks/validators/task'

export {
  normalizeCreateTaskAuthoringInput,
  omitUndefined,
  readAliasedBodyValue,
} from './task_authoring_contract_input_mapper.js'

export function requireRequestBodyRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw ValidationException.fromIssues([
      validationIssue('body', 'Request body must be an object', 'REQUEST_OBJECT_REQUIRED'),
    ])
  }
  return value as Record<string, unknown>
}

export function normalizeRequiredSkillInput(value: unknown): Record<string, unknown>[] | undefined {
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

export function assertTaskDoesNotDeclareBusinessDomain(payload: Record<string, unknown>): void {
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

export function normalizeCreateTaskRequestPayload(payload: Record<string, unknown>): Record<string, unknown> {
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

export function normalizeUpdateTaskRequestPayload(payload: Record<string, unknown>): Record<string, unknown> {
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
  const payload = await createTaskRequestValidator.validate(normalizedRequest)
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
