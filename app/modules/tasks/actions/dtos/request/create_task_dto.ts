import { DateTime } from 'luxon'

import {
  buildCreateTaskDTOState,
  type CreateTaskDTOInput,
  type RequiredSkillInput,
} from './create_task_dto_state_builder.js'

import ValidationException from '#exceptions/validation_exception'
import type { DatabaseId } from '#types/database'

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
  public readonly expected_deliverables: Record<string, unknown>[]
  public readonly context_background?: string
  public readonly impact_scope?: string
  public readonly tech_stack: string[]
  public readonly environment?: string
  public readonly collaboration_type?: string
  public readonly complexity_notes?: string
  public readonly measurable_outcomes: Record<string, unknown>[]
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
      description: this.description ?? null,
      task_status_id: this.task_status_id,
      label: this.label ?? null,
      priority: this.priority ?? null,
      assigned_to: this.assigned_to ?? null,
      due_date: this.due_date ?? null,
      parent_task_id: this.parent_task_id ?? null,
      estimated_time: this.estimated_time,
      actual_time: this.actual_time,
      project_id: this.project_id,
      organization_id: this.organization_id,
      task_type: this.task_type,
      acceptance_criteria: this.acceptance_criteria,
      verification_method: this.verification_method,
      expected_deliverables: this.expected_deliverables,
      context_background: this.context_background ?? null,
      impact_scope: this.impact_scope ?? null,
      tech_stack: this.tech_stack,
      environment: this.environment ?? null,
      collaboration_type: this.collaboration_type ?? null,
      complexity_notes: this.complexity_notes ?? null,
      measurable_outcomes: this.measurable_outcomes,
      learning_objectives: this.learning_objectives,
      domain_tags: this.domain_tags,
      role_in_task: this.role_in_task ?? null,
      autonomy_level: this.autonomy_level ?? null,
      problem_category: this.problem_category ?? null,
      business_domain: this.business_domain ?? null,
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
