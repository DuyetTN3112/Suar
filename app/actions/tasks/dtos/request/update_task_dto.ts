import type { DateTime } from 'luxon'

import {
  buildUpdateTaskPayload,
  type UpdateTaskDTOInput,
  type UpdateTaskValidatedPayload,
} from './update_task_dto_payload_builder.js'

import type { DatabaseId } from '#types/database'

/**
 * DTO cho việc cập nhật task
 */
export default class UpdateTaskDTO {
  public readonly title?: string
  public readonly description?: string
  public readonly label?: string | null
  public readonly priority?: string | null
  public readonly assigned_to?: DatabaseId | null
  public readonly due_date?: DateTime | null
  public readonly parent_task_id?: DatabaseId | null
  public readonly estimated_time?: number
  public readonly actual_time?: number
  public readonly project_id?: DatabaseId
  public readonly updated_by?: DatabaseId

  private readonly providedFields: Set<string>

  static fromPartialUpdate(data: UpdateTaskDTOInput): UpdateTaskDTO {
    return new UpdateTaskDTO(data)
  }

  static fromValidatedPayload(
    payload: UpdateTaskValidatedPayload,
    updatedBy: DatabaseId
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
    this.assigned_to = payload.assigned_to
    this.due_date = payload.due_date
    this.parent_task_id = payload.parent_task_id
    this.estimated_time = payload.estimated_time
    this.actual_time = payload.actual_time
    this.project_id = payload.project_id
    this.updated_by = payload.updated_by
    this.providedFields = payload.providedFields
  }

  public hasUpdates(): boolean {
    const fieldsToCheck = Array.from(this.providedFields).filter((field) => field !== 'updated_by')
    return fieldsToCheck.length > 0
  }

  public getUpdatedFields(): string[] {
    return Array.from(this.providedFields).filter((field) => field !== 'updated_by')
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
      updates.title = this.title
    }

    if (this.providedFields.has('description')) {
      updates.description = this.description ?? null
    }

    if (this.providedFields.has('label')) {
      updates.label = this.label
    }

    if (this.providedFields.has('priority')) {
      updates.priority = this.priority
    }

    if (this.providedFields.has('assigned_to')) {
      updates.assigned_to = this.assigned_to
    }

    if (this.providedFields.has('due_date')) {
      updates.due_date = this.due_date
    }

    if (this.providedFields.has('parent_task_id')) {
      updates.parent_task_id = this.parent_task_id
    }

    if (this.providedFields.has('estimated_time')) {
      updates.estimated_time = this.estimated_time
    }

    if (this.providedFields.has('actual_time')) {
      updates.actual_time = this.actual_time
    }

    if (this.providedFields.has('project_id')) {
      updates.project_id = this.project_id
    }

    if (this.providedFields.has('updated_by')) {
      updates.updated_by = this.updated_by
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
