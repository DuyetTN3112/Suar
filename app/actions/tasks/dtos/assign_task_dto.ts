/**
 * DTO cho việc giao task cho người dùng
 *
 * Validates:
 * - task_id: ID của task, bắt buộc
 * - assigned_to: ID của người được giao (null = unassign)
 * - notify: Có gửi thông báo không (default: true)
 * - reason: Lý do giao/chuyển người (optional)
 *
 * Use cases:
 * - Assign task: assigned_to = user_id
 * - Unassign task: assigned_to = null
 * - Reassign task: assigned_to = new_user_id
 */
export default class AssignTaskDTO {
  public readonly task_id: number
  public readonly assigned_to: number | null
  public readonly notify: boolean
  public readonly reason?: string

  constructor(data: {
    task_id: number
    assigned_to: number | null
    notify?: boolean
    reason?: string
  }) {
    // Validate task_id
    if (!data.task_id || data.task_id <= 0) {
      throw new Error('ID task là bắt buộc')
    }

    // Validate assigned_to if not null
    if (data.assigned_to !== null && data.assigned_to <= 0) {
      throw new Error('ID người được giao không hợp lệ')
    }

    // Validate reason if provided
    if (data.reason !== undefined) {
      if (data.reason.trim().length === 0) {
        throw new Error('Lý do không được để trống')
      }

      if (data.reason.length > 500) {
        throw new Error('Lý do không được vượt quá 500 ký tự')
      }
    }

    this.task_id = data.task_id
    this.assigned_to = data.assigned_to
    this.notify = data.notify ?? true
    this.reason = data.reason?.trim()
  }

  /**
   * Kiểm tra xem có phải là unassign (bỏ giao việc) không
   */
  public isUnassigning(): boolean {
    return this.assigned_to === null
  }

  /**
   * Kiểm tra xem có phải là assign lần đầu không
   * Note: Cần check với old assigned_to trong Command
   */
  public isAssigning(): boolean {
    return this.assigned_to !== null
  }

  /**
   * Kiểm tra xem có gửi notification không
   */
  public shouldNotify(): boolean {
    return this.notify === true
  }

  /**
   * Kiểm tra xem có lý do không
   */
  public hasReason(): boolean {
    return this.reason !== undefined && this.reason.length > 0
  }

  /**
   * Lấy message audit log
   */
  public getAuditMessage(): string {
    if (this.isUnassigning()) {
      let message = 'Bỏ giao việc'
      if (this.hasReason()) {
        message += `: ${this.reason}`
      }
      return message
    }

    let message = `Giao task cho user #${this.assigned_to}`
    if (this.hasReason()) {
      message += `: ${this.reason}`
    }
    return message
  }

  /**
   * Lấy notification message cho người được giao
   */
  public getNotificationMessage(taskTitle: string, assignerName: string): string {
    if (this.isUnassigning()) {
      return `${assignerName} đã bỏ giao task: ${taskTitle}`
    }

    let message = `${assignerName} đã giao cho bạn task: ${taskTitle}`
    if (this.hasReason()) {
      message += ` (${this.reason})`
    }
    return message
  }

  /**
   * Convert DTO thành object để cập nhật database
   */
  public toObject(): Record<string, any> {
    return {
      assigned_to: this.assigned_to,
    }
  }
}
