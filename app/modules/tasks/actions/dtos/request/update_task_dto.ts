import type { DateTime } from 'luxon'

import {
  buildUpdateTaskPayload,
  type UpdateTaskDTOInput,
  type UpdateTaskValidatedPayload,
} from './update_task_dto_payload_builder.js'

import type { CreateTaskAuthoringState } from '#modules/tasks/actions/dtos/request/task-authoring/create_task_authoring'

/**
 * DTO cho việc cập nhật task
 */
export default class UpdateTaskDTO {
  public readonly title: string | undefined
  public readonly description: string | undefined
  public readonly label: string | null | undefined
  public readonly priority: string | null | undefined
  public readonly task_visibility: string | undefined
  public readonly assigned_to: string | null | undefined
  public readonly due_date: DateTime | null | undefined
  public readonly parent_task_id: string | null | undefined
  public readonly estimated_time: number | undefined
  public readonly actual_time: number | undefined
  public readonly project_id: string | undefined
  public readonly project_sprint_id: string | null | undefined
  public readonly updated_by: string | undefined
  public readonly expected_updated_at: string | undefined

  public readonly task_type: string | undefined
  public readonly acceptance_criteria: string | undefined
  public readonly verification_method: string | undefined
  public readonly expected_deliverables: Record<string, unknown>[] | undefined
  public readonly context_background: string | undefined
  public readonly impact_scope: string | undefined
  public readonly tech_stack: string[] | undefined
  public readonly environment: string | undefined
  public readonly collaboration_type: string | undefined
  public readonly complexity_notes: string | undefined
  public readonly measurable_outcomes: Record<string, unknown>[] | undefined
  public readonly learning_objectives: string[] | undefined
  public readonly role_in_task: string | undefined
  public readonly autonomy_level: string | undefined
  public readonly problem_category: string | undefined
  public readonly estimated_users_affected: number | undefined
  public readonly authoring: CreateTaskAuthoringState | undefined

  private readonly providedFields: Set<string>

  static fromPartialUpdate(data: UpdateTaskDTOInput): UpdateTaskDTO {
    return new UpdateTaskDTO(data)
  }

  static fromValidatedPayload(
    payload: UpdateTaskValidatedPayload,
    updatedBy: string
  ): UpdateTaskDTO {
    return new UpdateTaskDTO({
      ...payload,
      updated_by: updatedBy,
    })
  }

  constructor(data: UpdateTaskDTOInput) {
    const payload = buildUpdateTaskPayload(data)

    this.title = payload.title
    this.description = payload.description
    this.label = payload.label
    this.priority = payload.priority
    this.task_visibility = payload.task_visibility
    this.assigned_to = payload.assigned_to
    this.due_date = payload.due_date
    this.parent_task_id = payload.parent_task_id
    this.estimated_time = payload.estimated_time
    this.actual_time = payload.actual_time
    this.project_id = payload.project_id
    this.project_sprint_id = payload.project_sprint_id
    this.updated_by = payload.updated_by
    this.expected_updated_at = payload.expected_updated_at
    
    this.task_type = payload.task_type
    this.acceptance_criteria = payload.acceptance_criteria
    this.verification_method = payload.verification_method
    this.expected_deliverables = payload.expected_deliverables
    this.context_background = payload.context_background
    this.impact_scope = payload.impact_scope
    this.tech_stack = payload.tech_stack
    this.environment = payload.environment
    this.collaboration_type = payload.collaboration_type
    this.complexity_notes = payload.complexity_notes
    this.measurable_outcomes = payload.measurable_outcomes
    this.learning_objectives = payload.learning_objectives
    this.role_in_task = payload.role_in_task
    this.autonomy_level = payload.autonomy_level
    this.problem_category = payload.problem_category
    this.estimated_users_affected = payload.estimated_users_affected
    this.authoring = payload.authoring

    this.providedFields = payload.providedFields
  }

  public hasUpdates(): boolean {
    const fieldsToCheck = Array.from(this.providedFields).filter(
      (field) => field !== 'updated_by' && field !== 'expected_updated_at'
    )
    return fieldsToCheck.length > 0
  }

  public getUpdatedFields(): string[] {
    return Array.from(this.providedFields).filter(
      (field) => field !== 'updated_by' && field !== 'expected_updated_at' && field !== 'authoring'
    )
  }

  public hasAuthoringUpdate(): boolean {
    return this.providedFields.has('authoring')
  }

  public hasAssigneeChange(): boolean {
    return this.providedFields.has('assigned_to')
  }

  public hasDueDateChange(): boolean {
    return this.providedFields.has('due_date')
  }

  public hasParentChange(): boolean {
    return this.providedFields.has('parent_task_id')
  }

  public hasProjectChange(): boolean {
    return this.providedFields.has('project_id')
  }

  public hasProjectSprintChange(): boolean {
    return this.providedFields.has('project_sprint_id')
  }

  public hasTimeTrackingChange(): boolean {
    return this.providedFields.has('estimated_time') || this.providedFields.has('actual_time')
  }

  public isUnassigning(): boolean {
    return this.providedFields.has('assigned_to') && this.assigned_to === null
  }

  public isRemovingDueDate(): boolean {
    return this.providedFields.has('due_date') && this.due_date === null
  }

  public isRemovingParent(): boolean {
    return this.providedFields.has('parent_task_id') && this.parent_task_id === null
  }

  public toObject(): Record<string, unknown> {
    const updates: Record<string, unknown> = {}

    if (this.providedFields.has('title')) {
      updates['title'] = this.title
    }

    if (this.providedFields.has('description')) {
      updates['description'] = this.description ?? null
    }

    if (this.providedFields.has('label')) {
      updates['label'] = this.label
    }

    if (this.providedFields.has('priority')) {
      updates['priority'] = this.priority
    }

    if (this.providedFields.has('task_visibility')) {
      updates['task_visibility'] = this.task_visibility
    }

    if (this.providedFields.has('assigned_to')) {
      updates['assigned_to'] = this.assigned_to
    }

    if (this.providedFields.has('due_date')) {
      updates['due_date'] = this.due_date
    }

    if (this.providedFields.has('parent_task_id')) {
      updates['parent_task_id'] = this.parent_task_id
    }

    if (this.providedFields.has('estimated_time')) {
      updates['estimated_time'] = this.estimated_time
    }

    if (this.providedFields.has('actual_time')) {
      updates['actual_time'] = this.actual_time
    }

    if (this.providedFields.has('project_id')) {
      updates['project_id'] = this.project_id
    }

    if (this.providedFields.has('project_sprint_id')) {
      updates['project_sprint_id'] = this.project_sprint_id
    }

    if (this.providedFields.has('updated_by')) {
      updates['updated_by'] = this.updated_by
    }

    const richFields = [
      'task_type',
      'acceptance_criteria',
      'verification_method',
      'expected_deliverables',
      'context_background',
      'impact_scope',
      'tech_stack',
      'environment',
      'collaboration_type',
      'complexity_notes',
      'measurable_outcomes',
      'learning_objectives',
      'role_in_task',
      'autonomy_level',
      'problem_category',
      'estimated_users_affected',
    ] as const

    for (const field of richFields) {
      if (this.providedFields.has(field)) {
        updates[field] = this[field]
      }
    }

    return updates
  }

  public getAuditMessage(): string {
    const changes = this.getUpdatedFields()

    if (changes.length === 0) {
      return 'Cập nhật task (không có thay đổi)'
    }

    const changeMessages: string[] = []

    if (this.hasAssigneeChange()) {
      if (this.isUnassigning()) {
        changeMessages.push('bỏ giao việc')
      } else {
        changeMessages.push('người được giao')
      }
    }

    if (this.hasDueDateChange()) {
      if (this.isRemovingDueDate()) {
        changeMessages.push('xóa deadline')
      } else {
        changeMessages.push('deadline')
      }
    }

    if (this.hasTimeTrackingChange()) {
      changeMessages.push('thời gian')
    }

    if (this.providedFields.has('title')) {
      changeMessages.push('tiêu đề')
    }

    if (this.providedFields.has('description')) {
      changeMessages.push('mô tả')
    }

    if (this.hasParentChange()) {
      changeMessages.push('task cha')
    }

    if (this.hasProjectChange()) {
      changeMessages.push('dự án')
    }

    if (this.hasProjectSprintChange()) {
      changeMessages.push('sprint')
    }

    return `Cập nhật task: ${changeMessages.join(', ')}`
  }

  public getChangesForAudit(
    currentTask: Record<string, unknown>
  ): { field: string; oldValue: unknown; newValue: unknown }[] {
    const changes: { field: string; oldValue: unknown; newValue: unknown }[] = []

    for (const field of this.getUpdatedFields()) {
      const oldValue = currentTask[field]
      const newValue = (this as Record<string, unknown>)[field]

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field,
          oldValue,
          newValue,
        })
      }
    }

    return changes
  }
}
