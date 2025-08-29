import { DateTime } from 'luxon'

import { TaskLabel, TaskPriority } from '#constants/task_constants'
import ValidationException from '#exceptions/validation_exception'
import type { DatabaseId } from '#types/database'

export interface RequiredSkillInput {
  id: DatabaseId
  level: string
}

export interface CreateTaskDTOInput {
  title: string
  description?: string
  task_status_id: string
  label?: string
  priority?: string
  assigned_to?: DatabaseId
  due_date?: string | DateTime
  parent_task_id?: DatabaseId
  estimated_time?: number
  actual_time?: number
  project_id: DatabaseId
  organization_id: DatabaseId
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
}

export interface CreateTaskDTOState {
  title: string
  description?: string
  task_status_id: string
  label?: string
  priority?: string
  assigned_to?: DatabaseId
  due_date?: DateTime
  parent_task_id?: DatabaseId
  estimated_time: number
  actual_time: number
  project_id: DatabaseId
  organization_id: DatabaseId
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
}

const VALID_TASK_TYPES = new Set([
  'feature_development',
  'bug_fix',
  'refactoring',
  'architecture_design',
  'code_review',
  'system_integration',
  'ui_ux_design',
  'prototype',
  'api_design',
  'qa_testing',
  'test_automation',
  'performance_testing',
  'devops_deployment',
  'infrastructure',
  'monitoring_setup',
  'data_analysis',
  'data_pipeline',
  'reporting',
  'technical_writing',
  'documentation',
  'knowledge_transfer',
  'research_spike',
  'poc',
  'product_management',
  'mentoring',
])

const VALID_VERIFICATION_METHODS = new Set([
  'code_review',
  'automated_test',
  'manual_qa',
  'demo_presentation',
  'manager_approval',
  'peer_review',
  'user_acceptance_test',
  'a_b_test',
  'load_test',
  'security_audit',
  'documentation_review',
  'multi_step',
])

const VALID_REQUIRED_SKILL_LEVELS = new Set([
  'beginner',
  'elementary',
  'junior',
  'middle',
  'senior',
  'lead',
  'principal',
  'master',
])

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

function normalizeTaskType(taskType?: string): string {
  const normalizedTaskType = (taskType ?? 'feature_development').trim()
  if (!VALID_TASK_TYPES.has(normalizedTaskType)) {
    throw new ValidationException('Loại task không hợp lệ')
  }

  return normalizedTaskType
}

function normalizeAcceptanceCriteria(value?: string): string {
  const acceptanceCriteria = value?.trim() ?? ''
  if (acceptanceCriteria.length === 0) {
    throw new ValidationException('Acceptance criteria là bắt buộc')
  }

  return acceptanceCriteria
}

function normalizeVerificationMethod(value?: string): string {
  const verificationMethod = (value ?? 'code_review').trim()
  if (!VALID_VERIFICATION_METHODS.has(verificationMethod)) {
    throw new ValidationException('Phương thức xác minh không hợp lệ')
  }

  return verificationMethod
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

function validateOptionalDatabaseId(
  value: DatabaseId | undefined,
  message: string
): DatabaseId | undefined {
  if (value !== undefined && !value) {
    throw new ValidationException(message)
  }

  return value
}

function normalizeRequiredProjectId(projectId: DatabaseId): DatabaseId {
  if (!projectId || projectId.trim().length === 0) {
    throw new ValidationException('ID dự án là bắt buộc')
  }

  return projectId.trim()
}

function validateRequiredOrganizationId(organizationId: DatabaseId): DatabaseId {
  if (!organizationId) {
    throw new ValidationException('ID tổ chức là bắt buộc')
  }

  return organizationId
}

function normalizeRequiredSkills(requiredSkills?: RequiredSkillInput[]): RequiredSkillInput[] {
  const normalizedRequiredSkills = requiredSkills ?? []

  if (!Array.isArray(normalizedRequiredSkills)) {
    throw new ValidationException('Danh sách kỹ năng yêu cầu không hợp lệ')
  }

  if (normalizedRequiredSkills.length === 0) {
    throw new ValidationException('Task phải có ít nhất 1 kỹ năng yêu cầu')
  }

  const seenSkillIds = new Set<string>()

  return normalizedRequiredSkills.map((skill) => {
    const skillId = skill.id
    if (!skillId) {
      throw new ValidationException('ID kỹ năng yêu cầu không hợp lệ')
    }

    if (seenSkillIds.has(skillId)) {
      throw new ValidationException('Kỹ năng yêu cầu bị trùng lặp')
    }

    seenSkillIds.add(skillId)

    const level = skill.level.trim().toLowerCase()
    if (!VALID_REQUIRED_SKILL_LEVELS.has(level)) {
      throw new ValidationException(`Cấp độ kỹ năng không hợp lệ: ${level}`)
    }

    return {
      id: skillId,
      level,
    }
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
  return {
    title: normalizeRequiredTitle(data.title),
    description: normalizeOptionalDescription(data.description),
    task_status_id: normalizeRequiredTaskStatusId(data.task_status_id),
    label: validateOptionalLabel(data.label),
    priority: validateOptionalPriority(data.priority),
    assigned_to: validateOptionalDatabaseId(data.assigned_to, 'ID người được giao không hợp lệ'),
    due_date: normalizeDueDate(data.due_date),
    parent_task_id: validateOptionalDatabaseId(data.parent_task_id, 'ID task cha không hợp lệ'),
    estimated_time:
      validateOptionalNonNegativeNumber(data.estimated_time, 'Thời gian ước tính không được âm') ??
      0,
    actual_time:
      validateOptionalNonNegativeNumber(data.actual_time, 'Thời gian thực tế không được âm') ?? 0,
    project_id: normalizeRequiredProjectId(data.project_id),
    organization_id: validateRequiredOrganizationId(data.organization_id),
    required_skills: normalizeRequiredSkills(data.required_skills),
    task_type: normalizeTaskType(data.task_type),
    acceptance_criteria: normalizeAcceptanceCriteria(data.acceptance_criteria),
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
  }
}
