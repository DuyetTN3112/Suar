import { DateTime } from 'luxon'

/**
 * DTO cho việc cập nhật task
 *
 * Cho phép cập nhật một phần (partial update) các trường:
 * - title, description
 * - status_id, label_id, priority_id
 * - assigned_to (chuyển người)
 * - due_date
 * - parent_task_id (chuyển subtask)
 * - estimated_time, actual_time
 * - project_id (chuyển dự án)
 * - updated_by (người cập nhật)
 *
 * Provides:
 * - Change tracking (getUpdatedFields)
 * - Validation cho từng field
 * - Helper methods để check các loại thay đổi
 */
export default class UpdateTaskDTO {
  public readonly title?: string
  public readonly description?: string
  public readonly status_id?: number
  public readonly label_id?: number | null
  public readonly priority_id?: number | null
  public readonly assigned_to?: number | null
  public readonly due_date?: DateTime | null
  public readonly parent_task_id?: number | null
  public readonly estimated_time?: number
  public readonly actual_time?: number
  public readonly project_id?: number | null
  public readonly updated_by?: number

  private readonly providedFields: Set<string> = new Set()

  constructor(data: {
    title?: string
    description?: string
    status_id?: number
    label_id?: number | null
    priority_id?: number | null
    assigned_to?: number | null
    due_date?: string | DateTime | null
    parent_task_id?: number | null
    estimated_time?: number
    actual_time?: number
    project_id?: number | null
    updated_by?: number
  }) {
    // Validate title if provided
    if (data.title !== undefined) {
      if (data.title.trim().length === 0) {
        throw new Error('Tiêu đề task không được để trống')
      }

      if (data.title.trim().length < 3) {
        throw new Error('Tiêu đề task phải có ít nhất 3 ký tự')
      }

      if (data.title.length > 255) {
        throw new Error('Tiêu đề task không được vượt quá 255 ký tự')
      }

      this.title = data.title.trim()
      this.providedFields.add('title')
    }

    // Validate description if provided
    if (data.description !== undefined) {
      if (data.description && data.description.length > 5000) {
        throw new Error('Mô tả task không được vượt quá 5000 ký tự')
      }

      this.description = data.description?.trim()
      this.providedFields.add('description')
    }

    // Validate status_id if provided
    if (data.status_id !== undefined) {
      if (data.status_id <= 0) {
        throw new Error('ID trạng thái không hợp lệ')
      }

      this.status_id = data.status_id
      this.providedFields.add('status_id')
    }

    // Validate label_id if provided
    if (data.label_id !== undefined) {
      if (data.label_id !== null && data.label_id <= 0) {
        throw new Error('ID nhãn không hợp lệ')
      }

      this.label_id = data.label_id
      this.providedFields.add('label_id')
    }

    // Validate priority_id if provided
    if (data.priority_id !== undefined) {
      if (data.priority_id !== null && data.priority_id <= 0) {
        throw new Error('ID mức độ ưu tiên không hợp lệ')
      }

      this.priority_id = data.priority_id
      this.providedFields.add('priority_id')
    }

    // Validate assigned_to if provided
    if (data.assigned_to !== undefined) {
      if (data.assigned_to !== null && data.assigned_to <= 0) {
        throw new Error('ID người được giao không hợp lệ')
      }

      this.assigned_to = data.assigned_to
      this.providedFields.add('assigned_to')
    }

    // Validate parent_task_id if provided
    if (data.parent_task_id !== undefined) {
      if (data.parent_task_id !== null && data.parent_task_id <= 0) {
        throw new Error('ID task cha không hợp lệ')
      }

      this.parent_task_id = data.parent_task_id
      this.providedFields.add('parent_task_id')
    }

    // Validate project_id if provided
    if (data.project_id !== undefined) {
      if (data.project_id !== null && data.project_id <= 0) {
        throw new Error('ID dự án không hợp lệ')
      }

      this.project_id = data.project_id
      this.providedFields.add('project_id')
    }

    // Validate time fields if provided
    if (data.estimated_time !== undefined) {
      if (data.estimated_time < 0) {
        throw new Error('Thời gian ước tính không được âm')
      }

      this.estimated_time = data.estimated_time
      this.providedFields.add('estimated_time')
    }

    if (data.actual_time !== undefined) {
      if (data.actual_time < 0) {
        throw new Error('Thời gian thực tế không được âm')
      }

      this.actual_time = data.actual_time
      this.providedFields.add('actual_time')
    }

    // Validate and parse due_date if provided
    if (data.due_date !== undefined) {
      let parsedDueDate: DateTime | null = null

      if (data.due_date !== null) {
        if (typeof data.due_date === 'string') {
          parsedDueDate = DateTime.fromISO(data.due_date)
          if (!parsedDueDate.isValid) {
            throw new Error('Ngày hết hạn không hợp lệ')
          }
        } else {
          parsedDueDate = data.due_date
        }
      }

      this.due_date = parsedDueDate
      this.providedFields.add('due_date')
    }

    // Set updated_by if provided
    if (data.updated_by !== undefined) {
      if (data.updated_by <= 0) {
        throw new Error('ID người cập nhật không hợp lệ')
      }

      this.updated_by = data.updated_by
      this.providedFields.add('updated_by')
    }
  }

  /**
   * Kiểm tra xem có field nào được cập nhật không
   */
  public hasUpdates(): boolean {
    // Exclude updated_by from the check
    const fieldsToCheck = Array.from(this.providedFields).filter((f) => f !== 'updated_by')
    return fieldsToCheck.length > 0
  }

  /**
   * Lấy danh sách các field đã được cập nhật
   */
  public getUpdatedFields(): string[] {
    return Array.from(this.providedFields).filter((f) => f !== 'updated_by')
  }

  /**
   * Kiểm tra xem có thay đổi status không
   */
  public hasStatusChange(): boolean {
    return this.providedFields.has('status_id')
  }

  /**
   * Kiểm tra xem có thay đổi assignee không
   */
  public hasAssigneeChange(): boolean {
    return this.providedFields.has('assigned_to')
  }

  /**
   * Kiểm tra xem có thay đổi due_date không
   */
  public hasDueDateChange(): boolean {
    return this.providedFields.has('due_date')
  }

  /**
   * Kiểm tra xem có thay đổi parent_task_id không
   */
  public hasParentChange(): boolean {
    return this.providedFields.has('parent_task_id')
  }

  /**
   * Kiểm tra xem có thay đổi project_id không
   */
  public hasProjectChange(): boolean {
    return this.providedFields.has('project_id')
  }

  /**
   * Kiểm tra xem có thay đổi time tracking không
   */
  public hasTimeTrackingChange(): boolean {
    return this.providedFields.has('estimated_time') || this.providedFields.has('actual_time')
  }

  /**
   * Kiểm tra xem có unassign task không (set assigned_to = null)
   */
  public isUnassigning(): boolean {
    return this.providedFields.has('assigned_to') && this.assigned_to === null
  }

  /**
   * Kiểm tra xem có remove due_date không
   */
  public isRemovingDueDate(): boolean {
    return this.providedFields.has('due_date') && this.due_date === null
  }

  /**
   * Kiểm tra xem có remove parent (convert subtask thành task) không
   */
  public isRemovingParent(): boolean {
    return this.providedFields.has('parent_task_id') && this.parent_task_id === null
  }

  /**
   * Kiểm tra xem có remove project không
   */
  public isRemovingProject(): boolean {
    return this.providedFields.has('project_id') && this.project_id === null
  }

  /**
   * Convert DTO thành object để merge vào model
   * Chỉ include các field được provide
   */
  public toObject(): Record<string, any> {
    const updates: Record<string, any> = {}

    if (this.providedFields.has('title')) {
      updates.title = this.title
    }

    if (this.providedFields.has('description')) {
      updates.description = this.description || null
    }

    if (this.providedFields.has('status_id')) {
      updates.status_id = this.status_id
    }

    if (this.providedFields.has('label_id')) {
      updates.label_id = this.label_id
    }

    if (this.providedFields.has('priority_id')) {
      updates.priority_id = this.priority_id
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

  /**
   * Lấy message audit log cho các thay đổi
   */
  public getAuditMessage(): string {
    const changes = this.getUpdatedFields()

    if (changes.length === 0) {
      return 'Cập nhật task (không có thay đổi)'
    }

    const changeMessages: string[] = []

    if (this.hasStatusChange()) {
      changeMessages.push('trạng thái')
    }

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

  /**
   * So sánh với task hiện tại để lấy old/new values cho audit
   */
  public getChangesForAudit(currentTask: any): { field: string; oldValue: any; newValue: any }[] {
    const changes: { field: string; oldValue: any; newValue: any }[] = []

    for (const field of this.getUpdatedFields()) {
      const oldValue = currentTask[field]
      const newValue = (this as any)[field]

      // Only log if values are actually different
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
