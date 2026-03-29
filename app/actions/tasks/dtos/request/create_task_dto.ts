import { DateTime } from 'luxon'
import type { DatabaseId } from '#types/database'
import { TaskLabel, TaskPriority } from '#constants/task_constants'
import ValidationException from '#exceptions/validation_exception'

interface RequiredSkillInput {
  id: DatabaseId
  level: string
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

  constructor(data: {
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
  }) {
    // Validate title
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationException('Tiêu đề task là bắt buộc')
    }

    if (data.title.trim().length < 3) {
      throw new ValidationException('Tiêu đề task phải có ít nhất 3 ký tự')
    }

    if (data.title.length > 255) {
      throw new ValidationException('Tiêu đề task không được vượt quá 255 ký tự')
    }

    // Validate description length if provided
    if (data.description && data.description.length > 5000) {
      throw new ValidationException('Mô tả task không được vượt quá 5000 ký tự')
    }

    if (!data.task_status_id || data.task_status_id.trim().length === 0) {
      throw new ValidationException('task_status_id là bắt buộc')
    }

    // Validate label if provided (v3: inline VARCHAR)
    if (data.label !== undefined) {
      const validLabels = Object.values(TaskLabel) as string[]
      if (!validLabels.includes(data.label)) {
        throw new ValidationException('Nhãn task không hợp lệ')
      }
    }

    // Validate priority if provided (v3: inline VARCHAR)
    if (data.priority !== undefined) {
      const validPriorities = Object.values(TaskPriority) as string[]
      if (!validPriorities.includes(data.priority)) {
        throw new ValidationException('Mức độ ưu tiên không hợp lệ')
      }
    }

    // Validate v5 metadata
    const validTaskTypes = new Set([
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
    const taskType = (data.task_type ?? 'feature_development').trim()
    if (!validTaskTypes.has(taskType)) {
      throw new ValidationException('Loại task không hợp lệ')
    }

    const acceptanceCriteria = data.acceptance_criteria?.trim() ?? ''
    if (acceptanceCriteria.length === 0) {
      throw new ValidationException('Acceptance criteria là bắt buộc')
    }

    const validVerificationMethods = new Set([
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
    const verificationMethod = (data.verification_method ?? 'code_review').trim()
    if (!validVerificationMethods.has(verificationMethod)) {
      throw new ValidationException('Phương thức xác minh không hợp lệ')
    }

    if (data.estimated_users_affected !== undefined && data.estimated_users_affected < 0) {
      throw new ValidationException('estimated_users_affected không được âm')
    }

    if (data.assigned_to !== undefined && !data.assigned_to) {
      throw new ValidationException('ID người được giao không hợp lệ')
    }

    if (data.parent_task_id !== undefined && !data.parent_task_id) {
      throw new ValidationException('ID task cha không hợp lệ')
    }

    if (!data.project_id || data.project_id.trim().length === 0) {
      throw new ValidationException('ID dự án là bắt buộc')
    }

    const requiredSkills = data.required_skills ?? []
    if (!Array.isArray(requiredSkills)) {
      throw new ValidationException('Danh sách kỹ năng yêu cầu không hợp lệ')
    }
    if (requiredSkills.length === 0) {
      throw new ValidationException('Task phải có ít nhất 1 kỹ năng yêu cầu')
    }
    const validLevels = new Set([
      'beginner',
      'elementary',
      'junior',
      'middle',
      'senior',
      'lead',
      'principal',
      'master',
    ])
    const seenSkillIds = new Set<string>()
    for (const skill of requiredSkills) {
      const skillId = skill.id
      if (!skillId) {
        throw new ValidationException('ID kỹ năng yêu cầu không hợp lệ')
      }
      if (seenSkillIds.has(skillId)) {
        throw new ValidationException('Kỹ năng yêu cầu bị trùng lặp')
      }
      seenSkillIds.add(skillId)

      const level = skill.level.trim().toLowerCase()
      if (!validLevels.has(level)) {
        throw new ValidationException(`Cấp độ kỹ năng không hợp lệ: ${level}`)
      }
    }

    // Validate organization_id
    if (!data.organization_id) {
      throw new ValidationException('ID tổ chức là bắt buộc')
    }

    // Validate time fields
    if (data.estimated_time !== undefined && data.estimated_time < 0) {
      throw new ValidationException('Thời gian ước tính không được âm')
    }

    if (data.actual_time !== undefined && data.actual_time < 0) {
      throw new ValidationException('Thời gian thực tế không được âm')
    }

    // Validate and parse due_date
    let parsedDueDate: DateTime | undefined
    if (data.due_date) {
      if (typeof data.due_date === 'string') {
        parsedDueDate = DateTime.fromISO(data.due_date)
        if (!parsedDueDate.isValid) {
          throw new ValidationException('Ngày hết hạn không hợp lệ')
        }
      } else {
        parsedDueDate = data.due_date
      }

      // Optional: Check if due_date is in the past
      // if (parsedDueDate < DateTime.now()) {
      //   throw new ValidationException('Ngày hết hạn không được là quá khứ')
      // }
    }

    // Assign validated values
    this.title = data.title.trim()
    this.description = data.description?.trim()
    this.task_status_id = data.task_status_id.trim()
    this.label = data.label
    this.priority = data.priority
    this.assigned_to = data.assigned_to
    this.due_date = parsedDueDate
    this.parent_task_id = data.parent_task_id
    this.estimated_time = data.estimated_time ?? 0
    this.actual_time = data.actual_time ?? 0
    this.project_id = data.project_id.trim()
    this.organization_id = data.organization_id
    this.task_type = taskType
    this.acceptance_criteria = acceptanceCriteria
    this.verification_method = verificationMethod
    this.expected_deliverables = data.expected_deliverables ?? []
    this.context_background = data.context_background?.trim()
    this.impact_scope = data.impact_scope?.trim()
    this.tech_stack = data.tech_stack ?? []
    this.environment = data.environment?.trim()
    this.collaboration_type = data.collaboration_type?.trim()
    this.complexity_notes = data.complexity_notes?.trim()
    this.measurable_outcomes = data.measurable_outcomes ?? []
    this.learning_objectives = data.learning_objectives ?? []
    this.domain_tags = data.domain_tags ?? []
    this.role_in_task = data.role_in_task?.trim()
    this.autonomy_level = data.autonomy_level?.trim()
    this.problem_category = data.problem_category?.trim()
    this.business_domain = data.business_domain?.trim()
    this.estimated_users_affected = data.estimated_users_affected
    this.required_skills = requiredSkills.map((skill) => ({
      id: skill.id,
      level: skill.level.trim().toLowerCase(),
    }))
  }

  /**
   * Kiểm tra xem task có được giao cho ai không
   */
  public isAssigned(): boolean {
    return this.assigned_to !== undefined && !!this.assigned_to
  }

  /**
   * Kiểm tra xem task có deadline không
   */
  public hasDueDate(): boolean {
    return this.due_date !== undefined
  }

  /**
   * Kiểm tra xem task có phải là subtask không
   */
  public isSubtask(): boolean {
    return this.parent_task_id !== undefined && !!this.parent_task_id
  }

  /**
   * Kiểm tra xem task có thuộc dự án không
   */
  public belongsToProject(): boolean {
    return true
  }

  /**
   * Kiểm tra xem có thời gian ước tính không
   */
  public hasEstimatedTime(): boolean {
    return this.estimated_time > 0
  }

  /**
   * Lấy số ngày còn lại đến deadline (nếu có)
   * Return null nếu không có due_date
   * Return số âm nếu đã quá hạn
   */
  public getDaysUntilDue(): number | null {
    if (!this.due_date) {
      return null
    }

    const now = DateTime.now()
    const diff = this.due_date.diff(now, 'days')
    return Math.floor(diff.days)
  }

  /**
   * Kiểm tra xem task có quá hạn không (so với due_date)
   */
  public isOverdue(): boolean {
    if (!this.due_date) {
      return false
    }

    return this.due_date < DateTime.now()
  }

  /**
   * Convert DTO thành object để lưu vào database
   */
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

  /**
   * Lấy message audit log cho việc tạo task
   */
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

  /**
   * Lấy thông tin tóm tắt về task
   */
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
