import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'

/**
 * DTO cho việc cập nhật trạng thái task
 *
 * Validates:
 * - task_id: ID của task, bắt buộc
 * - status_id: ID của trạng thái mới, bắt buộc
 * - reason: Lý do thay đổi trạng thái (optional)
 *
 * Note: Có thể mở rộng để validate status transitions
 * Ví dụ: pending -> in_progress -> completed
 * Không cho phép: completed -> pending (cần reopen process)
 */
export default class UpdateTaskStatusDTO {
  public readonly task_id: DatabaseId
  public readonly status_id: DatabaseId
  public readonly reason?: string

  constructor(data: { task_id: DatabaseId; status_id: DatabaseId; reason?: string }) {
    // Validate task_id
    if (!data.task_id || Number(data.task_id) <= 0) {
      throw new ValidationException('ID task là bắt buộc')
    }

    // Validate status_id
    if (!data.status_id || Number(data.status_id) <= 0) {
      throw new ValidationException('ID trạng thái là bắt buộc')
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
    this.status_id = data.status_id
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
    let message = `Cập nhật trạng thái task thành status #${String(this.status_id)}`

    if (this.hasReason() && this.reason !== undefined) {
      message += `: ${this.reason}`
    }

    return message
  }

  /**
   * Validate status transition (có thể mở rộng)
   * @param currentStatusId - Trạng thái hiện tại
   * @param statusRules - Rules cho transitions (optional)
   * @returns true nếu transition hợp lệ
   */
  public validateTransition(
    currentStatusId: DatabaseId,
    statusRules?: Map<DatabaseId, DatabaseId[]>
  ): boolean {
    // Nếu không có rules, cho phép mọi transition
    if (!statusRules) {
      return true
    }

    // Nếu trạng thái không đổi, ok
    if (currentStatusId === this.status_id) {
      return true
    }

    // Check rules
    const allowedTransitions = statusRules.get(currentStatusId)
    if (!allowedTransitions) {
      // Không có rules cho status hiện tại, cho phép
      return true
    }

    return allowedTransitions.includes(this.status_id)
  }

  /**
   * Convert DTO thành object để cập nhật database
   */
  public toObject(): Record<string, unknown> {
    return {
      status_id: this.status_id,
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
