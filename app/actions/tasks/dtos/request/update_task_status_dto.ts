import ValidationException from '#exceptions/validation_exception'
import type { DatabaseId } from '#types/database'

/**
 * DTO cho việc cập nhật trạng thái task
 *
 * v4: Accepts task_status_id (UUID FK to task_statuses table) instead of status string.
 * Transition validation is handled by the command via DB-driven workflow rules.
 *
 * Validates:
 * - task_id: ID của task, bắt buộc
 * - task_status_id: UUID of the new task status, bắt buộc
 * - reason: Lý do thay đổi trạng thái (optional)
 */
export default class UpdateTaskStatusDTO {
  public readonly task_id: DatabaseId
  public readonly task_status_id: string
  public readonly reason?: string

  constructor(data: { task_id: DatabaseId; task_status_id: string; reason?: string }) {
    if (!data.task_id) {
      throw new ValidationException('ID task là bắt buộc')
    }

    if (!data.task_status_id) {
      throw new ValidationException('ID trạng thái mới là bắt buộc')
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
    this.task_status_id = data.task_status_id
    this.reason = data.reason?.trim()
  }

  /**
   * Kiểm tra xem có lý do thay đổi không
   */
  public hasReason(): boolean {
    return this.reason !== undefined && this.reason.length > 0
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
