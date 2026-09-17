import type { DateTime } from 'luxon'


import {
  buildCreateTaskAuthoringState,
  type CreateTaskAuthoringInput,
  type CreateTaskAuthoringState,
} from './create_task_authoring.js'
import {
  normalizeAcceptanceCriteria,
  normalizeDueDate,
  normalizeOptionalDescription,
  normalizeOptionalText,
  normalizeRequiredProjectId,
  normalizeRequiredTaskStatusId,
  normalizeRequiredTitle,
  normalizeTaskType,
  normalizeTaskVisibility,
  normalizeVerificationMethod,
  validateOptionalId,
  validateOptionalLabel,
  validateOptionalNonNegativeNumber,
  validateOptionalPriority,
  validateRequiredOrganizationId,
} from './create_task_dto_field_normalizers.js'
import {
  normalizeRequiredSkills,
  type RequiredSkillInput,
} from './create_task_dto_required_skills.js'

import ValidationException from '#modules/errors/public_contracts/validation_exception'

export type { RequiredSkillInput }

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

export interface CreateTaskDTOInput {
  title: string
  description?: string
  task_status_id: string
  label?: string
  priority?: string
  task_visibility?: string
  assigned_to?: string
  due_date?: string | DateTime
  parent_task_id?: string
  project_sprint_id?: string | null
  estimated_time?: number
  actual_time?: number
  project_id: string
  organization_id: string
  required_skills?: RequiredSkillInput[]
  task_type?: string
  acceptance_criteria?: string
  verification_method?: string
  expected_deliverables?: Record<string, unknown>[]
  context_background?: string
  impact_scope?: string
  tech_stack?: string[]
  environment?: string
  collaboration_type?: string
  complexity_notes?: string
  measurable_outcomes?: Record<string, unknown>[]
  learning_objectives?: string[]
  domain_tags?: string[]
  role_in_task?: string
  autonomy_level?: string
  problem_category?: string
  business_domain?: string
  estimated_users_affected?: number
  authoring?: CreateTaskAuthoringInput
}

export interface CreateTaskDTOState {
  title: string
  description?: string
  task_status_id: string
  label?: string
  priority?: string
  task_visibility: string
  assigned_to?: string
  due_date?: DateTime
  parent_task_id?: string
  project_sprint_id?: string | null
  estimated_time: number
  actual_time: number
  project_id: string
  organization_id: string
  required_skills: RequiredSkillInput[]
  task_type: string
  acceptance_criteria: string
  verification_method: string
  expected_deliverables: Record<string, unknown>[]
  context_background?: string
  impact_scope?: string
  tech_stack: string[]
  environment?: string
  collaboration_type?: string
  complexity_notes?: string
  measurable_outcomes: Record<string, unknown>[]
  learning_objectives: string[]
  domain_tags: string[]
  role_in_task?: string
  autonomy_level?: string
  problem_category?: string
  business_domain?: string
  estimated_users_affected?: number
  authoring: CreateTaskAuthoringState
}

export function buildCreateTaskDTOState(data: CreateTaskDTOInput): CreateTaskDTOState {
  const authoring = buildCreateTaskAuthoringState(data.authoring)
  const allowIncompleteDraft = authoring.explicit && authoring.intent === 'save_draft'
  const state = omitUndefined({
    title: normalizeRequiredTitle(data.title),
    description: normalizeOptionalDescription(data.description),
    task_status_id: normalizeRequiredTaskStatusId(data.task_status_id),
    label: validateOptionalLabel(data.label),
    priority: validateOptionalPriority(data.priority),
    task_visibility: normalizeTaskVisibility(data.task_visibility),
    assigned_to: validateOptionalId(data.assigned_to, 'ID người được giao không hợp lệ'),
    due_date: normalizeDueDate(data.due_date),
    parent_task_id: validateOptionalId(data.parent_task_id, 'ID task cha không hợp lệ'),
    project_sprint_id:
      data.project_sprint_id === null
        ? null
        : validateOptionalId(data.project_sprint_id, 'ID sprint không hợp lệ'),
    estimated_time:
      validateOptionalNonNegativeNumber(data.estimated_time, 'Thời gian ước tính không được âm') ??
      0,
    actual_time:
      validateOptionalNonNegativeNumber(data.actual_time, 'Thời gian thực tế không được âm') ?? 0,
    project_id: normalizeRequiredProjectId(data.project_id),
    organization_id: validateRequiredOrganizationId(data.organization_id),
    required_skills: normalizeRequiredSkills(data.required_skills, allowIncompleteDraft),
    task_type: normalizeTaskType(data.task_type),
    acceptance_criteria: normalizeAcceptanceCriteria(data.acceptance_criteria, allowIncompleteDraft),
    verification_method: normalizeVerificationMethod(data.verification_method),
    expected_deliverables: data.expected_deliverables ?? [],
    context_background: normalizeOptionalText(data.context_background),
    impact_scope: normalizeOptionalText(data.impact_scope),
    tech_stack: data.tech_stack ?? [],
    environment: normalizeOptionalText(data.environment),
    collaboration_type: normalizeOptionalText(data.collaboration_type),
    complexity_notes: normalizeOptionalText(data.complexity_notes),
    measurable_outcomes: data.measurable_outcomes ?? [],
    learning_objectives: data.learning_objectives ?? [],
    domain_tags: data.domain_tags ?? [],
    role_in_task: normalizeOptionalText(data.role_in_task),
    autonomy_level: normalizeOptionalText(data.autonomy_level),
    problem_category: normalizeOptionalText(data.problem_category),
    business_domain: normalizeOptionalText(data.business_domain),
    estimated_users_affected: validateOptionalNonNegativeNumber(
      data.estimated_users_affected,
      'estimated_users_affected không được âm'
    ),
    authoring,
  })

  if (state.assigned_to !== undefined && allowIncompleteDraft) {
    throw new ValidationException('Task Draft chưa đủ điều kiện để giao')
  }

  return state
}
