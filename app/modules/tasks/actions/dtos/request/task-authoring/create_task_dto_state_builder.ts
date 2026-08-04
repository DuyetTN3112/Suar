import { DateTime } from 'luxon'

import {
  buildCreateTaskAuthoringState,
  type CreateTaskAuthoringInput,
  type CreateTaskAuthoringState,
} from './create_task_authoring.js'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { isCanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'
import { isSkillCategoryCode } from '#modules/skills/public_contracts/skill_constants'
import { isCanonicalTaskType } from '#modules/tasks/domain/task-authoring/task_taxonomy'
import { normalizeTaskVerificationMethod } from '#modules/tasks/domain/task-authoring/task_verification_methods'
import {
  TaskLabel,
  TaskPriority,
  TaskVisibility,
} from '#modules/tasks/public_contracts/task_constants'

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


const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface RequiredSkillInput {
  id: string
  level?: string
  custom_name?: string
  category_code?: string | null
  // Semantic fields
  project_skill_id?: string
  source_project_professional_role_id?: string
  source_role_skill_id?: string
  minimum_level_id?: string
  target_level_id?: string
  assessment_ceiling_level_id?: string
  rubric_version_id?: string
  importance?: string
  weight?: number
  requirement_source?: string
  requirement_notes?: string
  is_mandatory?: boolean
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

function normalizeRequiredTitle(title: string): string {
  if (!title || title.trim().length === 0) {
    throw new ValidationException('Tiêu đề task là bắt buộc')
  }

  if (title.trim().length < 3) {
    throw new ValidationException('Tiêu đề task phải có ít nhất 3 ký tự')
  }

  if (title.length > 255) {
    throw new ValidationException('Tiêu đề task không được vượt quá 255 ký tự')
  }

  return title.trim()
}

function normalizeOptionalDescription(description?: string): string | undefined {
  if (description && description.length > 5000) {
    throw new ValidationException('Mô tả task không được vượt quá 5000 ký tự')
  }

  return description?.trim()
}

function normalizeRequiredTaskStatusId(taskStatusId: string): string {
  if (!taskStatusId || taskStatusId.trim().length === 0) {
    throw new ValidationException('task_status_id là bắt buộc')
  }

  return taskStatusId.trim()
}

function validateOptionalLabel(label?: string): string | undefined {
  if (label === undefined) {
    return undefined
  }

  const validLabels = Object.values(TaskLabel) as string[]
  if (!validLabels.includes(label)) {
    throw new ValidationException('Nhãn task không hợp lệ')
  }

  return label
}

function validateOptionalPriority(priority?: string): string | undefined {
  if (priority === undefined) {
    return undefined
  }

  const validPriorities = Object.values(TaskPriority) as string[]
  if (!validPriorities.includes(priority)) {
    throw new ValidationException('Mức độ ưu tiên không hợp lệ')
  }

  return priority
}

function normalizeTaskVisibility(taskVisibility?: string): string {
  if (taskVisibility === undefined) {
    return TaskVisibility.INTERNAL
  }

  const validVisibilities = Object.values(TaskVisibility) as string[]
  if (!validVisibilities.includes(taskVisibility)) {
    throw new ValidationException('Phạm vi task không hợp lệ')
  }

  return taskVisibility
}

function normalizeTaskType(taskType?: string): string {
  const normalizedTaskType = (taskType ?? 'feature_development').trim()
  if (!isCanonicalTaskType(normalizedTaskType)) {
    throw new ValidationException('Loại task không hợp lệ')
  }

  return normalizedTaskType
}

function normalizeAcceptanceCriteria(value: string | undefined, allowIncompleteDraft: boolean): string {
  const acceptanceCriteria = value?.trim() ?? ''
  if (!allowIncompleteDraft && acceptanceCriteria.length === 0) {
    throw new ValidationException('Acceptance criteria là bắt buộc')
  }

  return acceptanceCriteria
}

function normalizeVerificationMethod(value?: string): string {
  return normalizeTaskVerificationMethod(value)
}

function validateOptionalNonNegativeNumber(
  value: number | undefined,
  message: string
): number | undefined {
  if (value !== undefined && value < 0) {
    throw new ValidationException(message)
  }

  return value
}

function validateOptionalId(value: string | undefined, message: string): string | undefined {
  if (value !== undefined && !value) {
    throw new ValidationException(message)
  }

  return value
}

function normalizeRequiredProjectId(projectId: string): string {
  if (!projectId || projectId.trim().length === 0) {
    throw new ValidationException('ID dự án là bắt buộc')
  }

  return projectId.trim()
}

function validateRequiredOrganizationId(organizationId: string): string {
  if (!organizationId) {
    throw new ValidationException('ID tổ chức là bắt buộc')
  }

  return organizationId
}

function normalizeRequiredSkills(
  requiredSkills: RequiredSkillInput[] | undefined,
  allowIncompleteDraft: boolean
): RequiredSkillInput[] {
  const normalizedRequiredSkills = requiredSkills ?? []

  if (!Array.isArray(normalizedRequiredSkills)) {
    throw new ValidationException('Danh sách kỹ năng yêu cầu không hợp lệ')
  }

  if (!allowIncompleteDraft && normalizedRequiredSkills.length === 0) {
    throw new ValidationException('Task phải có ít nhất 1 kỹ năng yêu cầu')
  }

  const seenSkillIds = new Set<string>()

  return normalizedRequiredSkills.map((skill) => {
    const skillId = skill.id.trim()
    const customName = skill.custom_name?.trim().replace(/\s+/g, ' ')
    const categoryCode = skill.category_code?.trim() || null
    if (!skillId) {
      throw new ValidationException('ID kỹ năng yêu cầu không hợp lệ')
    }

    if (!customName && !UUID_REGEX.test(skillId)) {
      throw new ValidationException('ID kỹ năng yêu cầu không hợp lệ')
    }

    let dedupeKey: string
    if (customName) {
      if (!isSkillCategoryCode(categoryCode)) {
        throw new ValidationException('Nhóm kỹ năng custom không hợp lệ')
      }
      dedupeKey = `custom:${categoryCode}:${customName.toLowerCase()}`
    } else {
      dedupeKey = `id:${skillId}`
    }

    if (seenSkillIds.has(dedupeKey)) {
      throw new ValidationException('Kỹ năng yêu cầu bị trùng lặp')
    }

    seenSkillIds.add(dedupeKey)

    // Application boundary only accepts canonical public proficiency codes.
    if (skill.level !== undefined) {
      const level = skill.level.trim().toLowerCase()
      if (!isCanonicalProficiencyLevelCode(level)) {
        throw new ValidationException(`Cấp độ kỹ năng không hợp lệ: ${level}`)
      }
    }

    // Validate weight if provided
    if (skill.weight !== undefined && skill.weight < 0) {
      throw new ValidationException('Weight không được âm')
    }

    return omitUndefined({
      id: skillId,
      level: skill.level?.trim().toLowerCase(),
      custom_name: customName,
      category_code: categoryCode,
      project_skill_id: skill.project_skill_id,
      source_project_professional_role_id: skill.source_project_professional_role_id,
      source_role_skill_id: skill.source_role_skill_id,
      minimum_level_id: skill.minimum_level_id,
      target_level_id: skill.target_level_id,
      assessment_ceiling_level_id: skill.assessment_ceiling_level_id,
      rubric_version_id: skill.rubric_version_id,
      importance: skill.importance,
      weight: skill.weight,
      requirement_source: skill.requirement_source,
      requirement_notes: skill.requirement_notes,
      is_mandatory: skill.is_mandatory,
    })
  })
}

function normalizeDueDate(dueDate?: string | DateTime): DateTime | undefined {
  if (!dueDate) {
    return undefined
  }

  if (typeof dueDate === 'string') {
    const parsedDueDate = DateTime.fromISO(dueDate)
    if (!parsedDueDate.isValid) {
      throw new ValidationException('Ngày hết hạn không hợp lệ')
    }

    return parsedDueDate
  }

  return dueDate
}

function normalizeOptionalText(value?: string): string | undefined {
  return value?.trim()
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
