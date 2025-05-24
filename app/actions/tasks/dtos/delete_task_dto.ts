/**
 * DTO cho việc xóa task
 *
 * Validates:
 * - task_id: ID của task cần xóa, bắt buộc
 * - reason: Lý do xóa (optional, max 500 chars)
 * - permanent: Có xóa vĩnh viễn không (default: false = soft delete)
 *
 * Note: Hiện tại chỉ support soft delete (set deleted_at)
 * Hard delete có thể được thêm sau nếu cần
 */
export default class DeleteTaskDTO {
  public readonly task_id: number
  public readonly reason?: string
  public readonly permanent: boolean

  constructor(data: { task_id: number; reason?: string; permanent?: boolean }) {
    // Validate task_id
    if (!data.task_id || data.task_id <= 0) {
      throw new Error('ID task là bắt buộc')
    }

    // Validate reason if provided
    if (data.reason !== undefined) {
      if (data.reason.trim().length === 0) {
        throw new Error('Lý do xóa không được để trống')
      }

      if (data.reason.length > 500) {
        throw new Error('Lý do xóa không được vượt quá 500 ký tự')
      }
    }

    this.task_id = data.task_id
    this.reason = data.reason?.trim()
    this.permanent = data.permanent ?? false
  }

  /**
   * Kiểm tra xem có lý do xóa không
   */
  public hasReason(): boolean {
    return this.reason !== undefined && this.reason.length > 0
  }

  /**
   * Kiểm tra xem có phải là xóa vĩnh viễn không
   */
  public isPermanentDelete(): boolean {
    return this.permanent === true
  }

  /**
   * Lấy message audit log cho việc xóa task
   */
  public getAuditMessage(): string {
    let message = this.isPermanentDelete() ? 'Xóa vĩnh viễn task' : 'Xóa task (soft delete)'

    if (this.hasReason()) {
      message += `: ${this.reason}`
    }

    return message
  }

  /**
   * Lấy type của action xóa
   */
  public getDeleteType(): 'soft' | 'hard' {
    return this.isPermanentDelete() ? 'hard' : 'soft'
  }

  /**
   * Convert DTO thành object để log hoặc xử lý
   */
  public toObject(): Record<string, any> {
    return {
      task_id: this.task_id,
      reason: this.reason || null,
      permanent: this.permanent,
      delete_type: this.getDeleteType(),
    }
  }
}
