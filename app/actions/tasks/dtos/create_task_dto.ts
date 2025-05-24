import { DateTime } from 'luxon'

/**
 * DTO cho việc tạo task mới
 *
 * Validates:
 * - title: 3-255 ký tự, bắt buộc
 * - description: Không bắt buộc
 * - status_id: ID của trạng thái, bắt buộc
 * - label_id: ID của nhãn, không bắt buộc
 * - priority_id: ID của mức độ ưu tiên, không bắt buộc
 * - assigned_to: ID của người được giao, không bắt buộc
 * - due_date: Ngày hết hạn, không bắt buộc
 * - parent_task_id: ID của task cha (subtask), không bắt buộc
 * - estimated_time: Thời gian ước tính (giờ), mặc định 0
 * - actual_time: Thời gian thực tế (giờ), mặc định 0
 * - project_id: ID của dự án, không bắt buộc
 * - organization_id: ID của tổ chức, bắt buộc
 */
export default class CreateTaskDTO {
  public readonly title: string
  public readonly description?: string
  public readonly status_id: number
  public readonly label_id?: number
  public readonly priority_id?: number
  public readonly assigned_to?: number
  public readonly due_date?: DateTime
  public readonly parent_task_id?: number
  public readonly estimated_time: number
  public readonly actual_time: number
  public readonly project_id?: number
  public readonly organization_id: number

  constructor(data: {
    title: string
    description?: string
    status_id: number
    label_id?: number
    priority_id?: number
    assigned_to?: number
    due_date?: string | DateTime
    parent_task_id?: number
    estimated_time?: number
    actual_time?: number
    project_id?: number
    organization_id: number
  }) {
    // Validate title
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Tiêu đề task là bắt buộc')
    }

    if (data.title.trim().length < 3) {
      throw new Error('Tiêu đề task phải có ít nhất 3 ký tự')
    }

    if (data.title.length > 255) {
      throw new Error('Tiêu đề task không được vượt quá 255 ký tự')
    }

    // Validate description length if provided
    if (data.description && data.description.length > 5000) {
      throw new Error('Mô tả task không được vượt quá 5000 ký tự')
    }

    // Validate status_id
    if (!data.status_id || data.status_id <= 0) {
      throw new Error('Trạng thái task là bắt buộc')
    }

    // Validate optional IDs if provided
    if (data.label_id !== undefined && data.label_id <= 0) {
      throw new Error('ID nhãn không hợp lệ')
    }

    if (data.priority_id !== undefined && data.priority_id <= 0) {
      throw new Error('ID mức độ ưu tiên không hợp lệ')
    }

    if (data.assigned_to !== undefined && data.assigned_to <= 0) {
      throw new Error('ID người được giao không hợp lệ')
    }

    if (data.parent_task_id !== undefined && data.parent_task_id <= 0) {
      throw new Error('ID task cha không hợp lệ')
    }

    if (data.project_id !== undefined && data.project_id <= 0) {
      throw new Error('ID dự án không hợp lệ')
    }

    // Validate organization_id
    if (!data.organization_id || data.organization_id <= 0) {
      throw new Error('ID tổ chức là bắt buộc')
    }

    // Validate time fields
    if (data.estimated_time !== undefined && data.estimated_time < 0) {
      throw new Error('Thời gian ước tính không được âm')
    }

    if (data.actual_time !== undefined && data.actual_time < 0) {
      throw new Error('Thời gian thực tế không được âm')
    }

    // Validate and parse due_date
    let parsedDueDate: DateTime | undefined
    if (data.due_date) {
      if (typeof data.due_date === 'string') {
        parsedDueDate = DateTime.fromISO(data.due_date)
        if (!parsedDueDate.isValid) {
          throw new Error('Ngày hết hạn không hợp lệ')
        }
      } else {
        parsedDueDate = data.due_date
      }

      // Optional: Check if due_date is in the past
      // if (parsedDueDate < DateTime.now()) {
      //   throw new Error('Ngày hết hạn không được là quá khứ')
      // }
    }

    // Assign validated values
    this.title = data.title.trim()
    this.description = data.description?.trim()
    this.status_id = data.status_id
    this.label_id = data.label_id
    this.priority_id = data.priority_id
    this.assigned_to = data.assigned_to
    this.due_date = parsedDueDate
    this.parent_task_id = data.parent_task_id
    this.estimated_time = data.estimated_time ?? 0
    this.actual_time = data.actual_time ?? 0
    this.project_id = data.project_id
    this.organization_id = data.organization_id
  }

  /**
   * Kiểm tra xem task có được giao cho ai không
   */
  public isAssigned(): boolean {
    return this.assigned_to !== undefined && this.assigned_to > 0
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
    return this.parent_task_id !== undefined && this.parent_task_id > 0
  }

  /**
   * Kiểm tra xem task có thuộc dự án không
   */
  public belongsToProject(): boolean {
    return this.project_id !== undefined && this.project_id > 0
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
  public toObject(): Record<string, any> {
    return {
      title: this.title,
      description: this.description || null,
      status_id: this.status_id,
      label_id: this.label_id || null,
      priority_id: this.priority_id || null,
      assigned_to: this.assigned_to || null,
      due_date: this.due_date || null,
      parent_task_id: this.parent_task_id || null,
      estimated_time: this.estimated_time,
      actual_time: this.actual_time,
      project_id: this.project_id || null,
      organization_id: this.organization_id,
    }
  }

  /**
   * Lấy message audit log cho việc tạo task
   */
  public getAuditMessage(): string {
    let message = `Tạo task: ${this.title}`

    if (this.isAssigned()) {
      message += ` (giao cho user #${this.assigned_to})`
    }

    if (this.isSubtask()) {
      message += ` (subtask của #${this.parent_task_id})`
    }

    if (this.belongsToProject()) {
      message += ` (thuộc dự án #${this.project_id})`
    }

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
