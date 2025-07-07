import { DateTime } from 'luxon'
import type { DatabaseId } from '#types/database'
import { TaskLabel, TaskPriority } from '#constants/task_constants'
import ValidationException from '#exceptions/validation_exception'

interface RequiredSkillInput {
  id: DatabaseId
  level: string
}

interface CreateTaskDTOInput {
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
  expected_deliverables?: Array<Record<string, unknown>>
  context_background?: string
  impact_scope?: string
  tech_stack?: string[]
  environment?: string
  collaboration_type?: string
  complexity_notes?: string
  measurable_outcomes?: Array<Record<string, unknown>>
  learning_objectives?: string[]
  domain_tags?: string[]
  role_in_task?: string
  autonomy_level?: string
  problem_category?: string
  business_domain?: string
  estimated_users_affected?: number
}

export interface CreateTaskCoreInput {
  title: string
  task_status_id: string
  project_id: DatabaseId
  organization_id: DatabaseId
  required_skills: RequiredSkillInput[]
  description?: string
  label?: string
  priority?: string
  assigned_to?: DatabaseId
  due_date?: string | DateTime
  parent_task_id?: DatabaseId
  estimated_time?: number
  actual_time?: number
}

export interface CreateTaskSpecificationInput {
  task_type?: string
  acceptance_criteria?: string
  verification_method?: string
  expected_deliverables?: Array<Record<string, unknown>>
  context_background?: string
  impact_scope?: string
  tech_stack?: string[]
  environment?: string
  collaboration_type?: string
  complexity_notes?: string
  measurable_outcomes?: Array<Record<string, unknown>>
  learning_objectives?: string[]
  domain_tags?: string[]
  role_in_task?: string
  autonomy_level?: string
  problem_category?: string
  business_domain?: string
  estimated_users_affected?: number
}

interface CreateTaskDTOState {
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
  expected_deliverables: Array<Record<string, unknown>>
  context_background?: string
  impact_scope?: string
  tech_stack: string[]
  environment?: string
  collaboration_type?: string
  complexity_notes?: string
  measurable_outcomes: Array<Record<string, unknown>>
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

function buildCreateTaskDTOState(data: CreateTaskDTOInput): CreateTaskDTOState {
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

/**
 * DTO cho việc tạo task mới
 *
 * Validates:
 * - title: 3-255 ký tự, bắt buộc
 * - description: Không bắt buộc
 * - task_status_id: UUID trạng thái task theo workflow của tổ chức, bắt buộc
 * - label: Nhãn (v3: inline VARCHAR), không bắt buộc
 * - priority: Mức độ ưu tiên (v3: inline VARCHAR), không bắt buộc
 * - assigned_to: ID của người được giao, không bắt buộc
 * - due_date: Ngày hết hạn, không bắt buộc
 * - parent_task_id: ID của task cha (subtask), không bắt buộc
 * - estimated_time: Thời gian ước tính (giờ), mặc định 0
 * - actual_time: Thời gian thực tế (giờ), mặc định 0
 * - project_id: ID của dự án, bắt buộc
 * - organization_id: ID của tổ chức, bắt buộc
 */
export default class CreateTaskDTO {
  public readonly title: string
  public readonly description?: string
  public readonly task_status_id: string
  public readonly label?: string
  public readonly priority?: string
  public readonly assigned_to?: DatabaseId
  public readonly due_date?: DateTime
  public readonly parent_task_id?: DatabaseId
  public readonly estimated_time: number
  public readonly actual_time: number
  public readonly project_id: DatabaseId
  public readonly organization_id: DatabaseId
  public readonly required_skills: RequiredSkillInput[]
  public readonly task_type: string
  public readonly acceptance_criteria: string
  public readonly verification_method: string
  public readonly expected_deliverables: Array<Record<string, unknown>>
  public readonly context_background?: string
  public readonly impact_scope?: string
  public readonly tech_stack: string[]
  public readonly environment?: string
  public readonly collaboration_type?: string
  public readonly complexity_notes?: string
  public readonly measurable_outcomes: Array<Record<string, unknown>>
  public readonly learning_objectives: string[]
  public readonly domain_tags: string[]
  public readonly role_in_task?: string
  public readonly autonomy_level?: string
  public readonly problem_category?: string
  public readonly business_domain?: string
  public readonly estimated_users_affected?: number

  static fromCore(
    core: CreateTaskCoreInput,
    specification: CreateTaskSpecificationInput = {}
  ): CreateTaskDTO {
    return new CreateTaskDTO({
      ...core,
      acceptance_criteria: specification.acceptance_criteria ?? 'Task completion is verified',
      ...specification,
    })
  }

  static forSubtask(
    core: CreateTaskCoreInput & { parent_task_id: DatabaseId },
    specification: CreateTaskSpecificationInput = {}
  ): CreateTaskDTO {
    if (!core.parent_task_id) {
      throw new ValidationException('ID task cha không hợp lệ')
    }

    return CreateTaskDTO.fromCore(core, specification)
  }

  constructor(data: CreateTaskDTOInput) {
    const state = buildCreateTaskDTOState(data)

    this.title = state.title
    this.description = state.description
    this.task_status_id = state.task_status_id
    this.label = state.label
    this.priority = state.priority
    this.assigned_to = state.assigned_to
    this.due_date = state.due_date
    this.parent_task_id = state.parent_task_id
    this.estimated_time = state.estimated_time
    this.actual_time = state.actual_time
    this.project_id = state.project_id
    this.organization_id = state.organization_id
    this.required_skills = state.required_skills
    this.task_type = state.task_type
    this.acceptance_criteria = state.acceptance_criteria
    this.verification_method = state.verification_method
    this.expected_deliverables = state.expected_deliverables
    this.context_background = state.context_background
    this.impact_scope = state.impact_scope
    this.tech_stack = state.tech_stack
    this.environment = state.environment
    this.collaboration_type = state.collaboration_type
    this.complexity_notes = state.complexity_notes
    this.measurable_outcomes = state.measurable_outcomes
    this.learning_objectives = state.learning_objectives
    this.domain_tags = state.domain_tags
    this.role_in_task = state.role_in_task
    this.autonomy_level = state.autonomy_level
    this.problem_category = state.problem_category
    this.business_domain = state.business_domain
    this.estimated_users_affected = state.estimated_users_affected
  }

  public isAssigned(): boolean {
    return this.assigned_to !== undefined && !!this.assigned_to
  }

  public hasDueDate(): boolean {
    return this.due_date !== undefined
  }

  public isSubtask(): boolean {
    return this.parent_task_id !== undefined && !!this.parent_task_id
  }

  public belongsToProject(): boolean {
    return true
  }

  public hasEstimatedTime(): boolean {
    return this.estimated_time > 0
  }

  public getDaysUntilDue(): number | null {
    if (!this.due_date) {
      return null
    }

    const now = DateTime.now()
    const diff = this.due_date.diff(now, 'days')
    return Math.floor(diff.days)
  }

  public isOverdue(): boolean {
    if (!this.due_date) {
      return false
    }

    return this.due_date < DateTime.now()
  }

  public toObject(): Record<string, unknown> {
    return {
      title: this.title,
      description: this.description || null,
      task_status_id: this.task_status_id,
      label: this.label || null,
      priority: this.priority || null,
      assigned_to: this.assigned_to || null,
      due_date: this.due_date || null,
      parent_task_id: this.parent_task_id || null,
      estimated_time: this.estimated_time,
      actual_time: this.actual_time,
      project_id: this.project_id,
      organization_id: this.organization_id,
      task_type: this.task_type,
      acceptance_criteria: this.acceptance_criteria,
      verification_method: this.verification_method,
      expected_deliverables: this.expected_deliverables,
      context_background: this.context_background || null,
      impact_scope: this.impact_scope || null,
      tech_stack: this.tech_stack,
      environment: this.environment || null,
      collaboration_type: this.collaboration_type || null,
      complexity_notes: this.complexity_notes || null,
      measurable_outcomes: this.measurable_outcomes,
      learning_objectives: this.learning_objectives,
      domain_tags: this.domain_tags,
      role_in_task: this.role_in_task || null,
      autonomy_level: this.autonomy_level || null,
      problem_category: this.problem_category || null,
      business_domain: this.business_domain || null,
      estimated_users_affected: this.estimated_users_affected ?? null,
      required_skills: this.required_skills,
    }
  }

  public getAuditMessage(): string {
    let message = `Tạo task: ${this.title}`

    if (this.isAssigned() && this.assigned_to !== undefined) {
      message += ` (giao cho user #${this.assigned_to})`
    }

    if (this.isSubtask() && this.parent_task_id !== undefined) {
      message += ` (subtask của #${this.parent_task_id})`
    }

    message += ` (thuộc dự án #${this.project_id})`

    return message
  }

  public getSummary(): string {
    const parts: string[] = [this.title]

    if (this.isSubtask()) {
      parts.push('(Subtask)')
    }

    if (this.hasDueDate()) {
      const daysUntil = this.getDaysUntilDue()
      if (daysUntil !== null) {
        if (daysUntil < 0) {
          parts.push(`⚠️ Quá hạn ${Math.abs(daysUntil)} ngày`)
        } else if (daysUntil === 0) {
          parts.push('⏰ Hết hạn hôm nay')
        } else if (daysUntil <= 3) {
          parts.push(`⏰ Còn ${daysUntil} ngày`)
        }
      }
    }

    if (this.hasEstimatedTime()) {
      parts.push(`⏱️ ${this.estimated_time}h`)
    }

    return parts.join(' ')
  }
}
