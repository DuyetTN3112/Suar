import { DateTime } from 'luxon'

import { TaskLabel, TaskPriority } from '#constants/task_constants'
import ValidationException from '#exceptions/validation_exception'
import type { DatabaseId } from '#types/database'

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

export interface UpdateTaskNormalizedPayload {
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

export function buildUpdateTaskPayload(data: UpdateTaskDTOInput): UpdateTaskNormalizedPayload {
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
      Object.values(TaskLabel),
      'Nhãn không hợp lệ'
    )
    payload.providedFields.add('label')
  }

  if (data.priority !== undefined) {
    payload.priority = normalizeOptionalEnum(
      data.priority,
      Object.values(TaskPriority),
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
