import type { DatabaseId } from '#types/database'
import { TaskStatus } from '#constants/task_constants'
import ValidationException from '#exceptions/validation_exception'

/**
 * DTO cho việc cập nhật trạng thái task
 *
 * Validates:
 * - task_id: ID của task, bắt buộc
 * - status: Trạng thái mới (v3: inline VARCHAR), bắt buộc
 * - reason: Lý do thay đổi trạng thái (optional)
 *
 * Note: Có thể mở rộng để validate status transitions
 * Ví dụ: pending -> in_progress -> completed
 * Không cho phép: completed -> pending (cần reopen process)
 */
export default class UpdateTaskStatusDTO {
  public readonly task_id: DatabaseId
  public readonly status: string
  public readonly reason?: string

  constructor(data: { task_id: DatabaseId; status: string; reason?: string }) {
    // Validate task_id
    if (!data.task_id) {
      throw new ValidationException('ID task là bắt buộc')
    }

    // Validate status (v3: inline VARCHAR)
    if (!data.status) {
      throw new ValidationException('Trạng thái là bắt buộc')
    }
    const validStatuses = Object.values(TaskStatus) as string[]
    if (!validStatuses.includes(data.status)) {
      throw new ValidationException('Trạng thái task không hợp lệ')
    }

    // Validate reason if provided
    if (data.reason !== undefined) {
      if (data.reason.trim().length === 0) {
        throw new ValidationException('Lý do không được để trống')
      }

      if (data.reason.length > 500) {
        throw new ValidationException('Lý do không được vượt quá 500 ký tự')
      }
    }

    this.task_id = data.task_id
    this.status = data.status
    this.reason = data.reason?.trim()
  }

  /**
   * Kiểm tra xem có lý do thay đổi không
   */
  public hasReason(): boolean {
    return this.reason !== undefined && this.reason.length > 0
  }

  /**
   * Lấy message audit log
   */
  public getAuditMessage(): string {
    let message = `Cập nhật trạng thái task thành ${this.status}`

    if (this.hasReason() && this.reason !== undefined) {
      message += `: ${this.reason}`
    }

    return message
  }

  /**
   * Validate status transition (có thể mở rộng)
   * @param currentStatus - Trạng thái hiện tại
   * @param statusRules - Rules cho transitions (optional)
   * @returns true nếu transition hợp lệ
   */
  public validateTransition(currentStatus: string, statusRules?: Map<string, string[]>): boolean {
    // Nếu không có rules, cho phép mọi transition
    if (!statusRules) {
      return true
    }

    // Nếu trạng thái không đổi, ok
    if (currentStatus === this.status) {
      return true
    }

    // Check rules
    const allowedTransitions = statusRules.get(currentStatus)
    if (!allowedTransitions) {
      // Không có rules cho status hiện tại, cho phép
      return true
    }

    return allowedTransitions.includes(this.status)
  }

  /**
   * Convert DTO thành object để cập nhật database
   */
  public toObject(): Record<string, unknown> {
    return {
      status: this.status,
    }
  }

  /**
   * Lấy notification message cho creator
   */
  public getNotificationMessage(taskTitle: string, updaterName: string): string {
    let message = `${updaterName} đã cập nhật trạng thái task: ${taskTitle}`

    if (this.hasReason() && this.reason !== undefined) {
      message += ` (${this.reason})`
    }

    return message
  }
}
