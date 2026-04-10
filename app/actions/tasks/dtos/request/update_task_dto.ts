import { DateTime } from 'luxon'
import type { DatabaseId } from '#types/database'
import { TaskLabel, TaskPriority } from '#constants/task_constants'
import ValidationException from '#exceptions/validation_exception'

export interface UpdateTaskDTOInput {
  title?: string
  description?: string
  label?: string | null
  priority?: string | null
  assigned_to?: DatabaseId | null
  due_date?: string | DateTime | null
  parent_task_id?: DatabaseId | null
  estimated_time?: number
  actual_time?: number
  project_id?: DatabaseId
  updated_by?: DatabaseId
}

export interface UpdateTaskValidatedPayload extends Omit<UpdateTaskDTOInput, 'updated_by'> {
  updated_by?: DatabaseId
}

interface UpdateTaskNormalizedPayload {
  title?: string
  description?: string
  label?: string | null
  priority?: string | null
  assigned_to?: DatabaseId | null
  due_date?: DateTime | null
  parent_task_id?: DatabaseId | null
  estimated_time?: number
  actual_time?: number
  project_id?: DatabaseId
  updated_by?: DatabaseId
  providedFields: Set<string>
}

function normalizeOptionalTitle(title: string | undefined): string | undefined {
  if (title === undefined) {
    return undefined
  }

  const normalizedTitle = title.trim()
  if (normalizedTitle.length === 0) {
    throw new ValidationException('Tiêu đề task không được để trống')
  }

  if (normalizedTitle.length < 3) {
    throw new ValidationException('Tiêu đề task phải có ít nhất 3 ký tự')
  }

  if (normalizedTitle.length > 255) {
    throw new ValidationException('Tiêu đề task không được vượt quá 255 ký tự')
  }

  return normalizedTitle
}

function normalizeOptionalDescription(description: string | undefined): string | undefined {
  if (description === undefined) {
    return undefined
  }

  if (description.length > 5000) {
    throw new ValidationException('Mô tả task không được vượt quá 5000 ký tự')
  }

  return description.trim()
}

function normalizeOptionalEnum(
  value: string | null | undefined,
  allowedValues: string[],
  message: string
): string | null | undefined {
  if (value === undefined || value === null) {
    return value
  }

  if (!allowedValues.includes(value)) {
    throw new ValidationException(message)
  }

  return value
}

function validateOptionalIdValue(
  value: DatabaseId | null | undefined,
  message: string
): DatabaseId | null | undefined {
  if (value !== undefined && value !== null && !value) {
    throw new ValidationException(message)
  }

  return value
}

function normalizeDueDate(
  value: string | DateTime | null | undefined
): DateTime | null | undefined {
  if (value === undefined || value === null) {
    return value
  }

  if (typeof value === 'string') {
    const parsedDueDate = DateTime.fromISO(value)
    if (!parsedDueDate.isValid) {
      throw new ValidationException('Ngày hết hạn không hợp lệ')
    }
    return parsedDueDate
  }

  return value
}

function validateNonNegativeNumber(value: number | undefined, message: string): number | undefined {
  if (value !== undefined && value < 0) {
    throw new ValidationException(message)
  }

  return value
}

function buildUpdateTaskPayload(data: UpdateTaskDTOInput): UpdateTaskNormalizedPayload {
  const payload: UpdateTaskNormalizedPayload = {
    providedFields: new Set(),
  }

  if (data.title !== undefined) {
    payload.title = normalizeOptionalTitle(data.title)
    payload.providedFields.add('title')
  }

  if (data.description !== undefined) {
    payload.description = normalizeOptionalDescription(data.description)
    payload.providedFields.add('description')
  }

  if (data.label !== undefined) {
    payload.label = normalizeOptionalEnum(
      data.label,
      Object.values(TaskLabel) as string[],
      'Nhãn không hợp lệ'
    )
    payload.providedFields.add('label')
  }

  if (data.priority !== undefined) {
    payload.priority = normalizeOptionalEnum(
      data.priority,
      Object.values(TaskPriority) as string[],
      'Mức độ ưu tiên không hợp lệ'
    )
    payload.providedFields.add('priority')
  }

  if (data.assigned_to !== undefined) {
    payload.assigned_to = validateOptionalIdValue(
      data.assigned_to,
      'ID người được giao không hợp lệ'
    )
    payload.providedFields.add('assigned_to')
  }

  if (data.parent_task_id !== undefined) {
    payload.parent_task_id = validateOptionalIdValue(
      data.parent_task_id,
      'ID task cha không hợp lệ'
    )
    payload.providedFields.add('parent_task_id')
  }

  if (data.project_id !== undefined) {
    if (!data.project_id) {
      throw new ValidationException('ID dự án không hợp lệ')
    }

    payload.project_id = data.project_id.trim()
    payload.providedFields.add('project_id')
  }

  if (data.estimated_time !== undefined) {
    payload.estimated_time = validateNonNegativeNumber(
      data.estimated_time,
      'Thời gian ước tính không được âm'
    )
    payload.providedFields.add('estimated_time')
  }

  if (data.actual_time !== undefined) {
    payload.actual_time = validateNonNegativeNumber(
      data.actual_time,
      'Thời gian thực tế không được âm'
    )
    payload.providedFields.add('actual_time')
  }

  if (data.due_date !== undefined) {
    payload.due_date = normalizeDueDate(data.due_date)
    payload.providedFields.add('due_date')
  }

  if (data.updated_by !== undefined) {
    if (!data.updated_by) {
      throw new ValidationException('ID người cập nhật không hợp lệ')
    }

    payload.updated_by = data.updated_by
    payload.providedFields.add('updated_by')
  }

  return payload
}

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
      updates.description = this.description || null
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
