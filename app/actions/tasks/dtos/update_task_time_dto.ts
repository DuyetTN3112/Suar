/**
 * DTO cho việc cập nhật thời gian của task
 *
 * Validates:
 * - task_id: ID của task, bắt buộc
 * - estimated_time: Thời gian ước tính (giờ), optional
 * - actual_time: Thời gian thực tế (giờ), optional
 *
 * Note: Ít nhất một trong hai field phải được provide
 */
export default class UpdateTaskTimeDTO {
  public readonly task_id: number
  public readonly estimated_time?: number
  public readonly actual_time?: number

  constructor(data: { task_id: number; estimated_time?: number; actual_time?: number }) {
    // Validate task_id
    if (!data.task_id || data.task_id <= 0) {
      throw new Error('ID task là bắt buộc')
    }

    // At least one time field must be provided
    if (data.estimated_time === undefined && data.actual_time === undefined) {
      throw new Error(
        'Phải cung cấp ít nhất một trong hai: thời gian ước tính hoặc thời gian thực tế')
    }

    // Validate estimated_time if provided
    if (data.estimated_time !== undefined) {
      if (data.estimated_time < 0) {
        throw new Error('Thời gian ước tính không được âm')
      }

      if (data.estimated_time > 999) {
        throw new Error('Thời gian ước tính không được vượt quá 999 giờ')
      }
    }

    // Validate actual_time if provided
    if (data.actual_time !== undefined) {
      if (data.actual_time < 0) {
        throw new Error('Thời gian thực tế không được âm')
      }

      if (data.actual_time > 999) {
        throw new Error('Thời gian thực tế không được vượt quá 999 giờ')
      }
    }

    this.task_id = data.task_id
    this.estimated_time = data.estimated_time
    this.actual_time = data.actual_time
  }

  /**
   * Kiểm tra xem có cập nhật estimated_time không
   */
  public hasEstimatedTimeUpdate(): boolean {
    return this.estimated_time !== undefined
  }

  /**
   * Kiểm tra xem có cập nhật actual_time không
   */
  public hasActualTimeUpdate(): boolean {
    return this.actual_time !== undefined
  }

  /**
   * Kiểm tra xem actual_time có vượt quá estimated_time không
   * Chỉ check được nếu cả hai đều được provide
   */
  public isOverEstimate(): boolean | null {
    if (this.estimated_time === undefined || this.actual_time === undefined) {
      return null
    }

    return this.actual_time > this.estimated_time
  }

  /**
   * Tính % thời gian thực tế so với ước tính
   * Return null nếu không đủ dữ liệu
   */
  public getCompletionPercentage(): number | null {
    if (this.estimated_time === undefined || this.actual_time === undefined) {
      return null
    }

    if (this.estimated_time === 0) {
      return null
    }

    return Math.round((this.actual_time / this.estimated_time) * 100)
  }

  /**
   * Lấy message audit log
   */
  public getAuditMessage(): string {
    const updates: string[] = []

    if (this.hasEstimatedTimeUpdate()) {
      updates.push(`thời gian ước tính: ${this.estimated_time}h`)
    }

    if (this.hasActualTimeUpdate()) {
      updates.push(`thời gian thực tế: ${this.actual_time}h`)
    }

    return `Cập nhật thời gian task (${updates.join(', ')})`
  }

  /**
   * Convert DTO thành object để cập nhật database
   */
  public toObject(): Record<string, any> {
    const updates: Record<string, any> = {}

    if (this.hasEstimatedTimeUpdate()) {
      updates.estimated_time = this.estimated_time
    }

    if (this.hasActualTimeUpdate()) {
      updates.actual_time = this.actual_time
    }

    return updates
  }

  /**
   * Lấy thông báo về hiệu suất (nếu có đủ dữ liệu)
   */
  public getPerformanceMessage(): string | null {
    const percentage = this.getCompletionPercentage()

    if (percentage === null) {
      return null
    }

    if (percentage <= 80) {
      return '🎉 Hoàn thành nhanh hơn dự kiến!'
    } else if (percentage <= 100) {
      return '✅ Hoàn thành đúng thời gian dự kiến'
    } else if (percentage <= 120) {
      return '⚠️ Vượt thời gian dự kiến một chút'
    } else {
      return '❗ Vượt thời gian dự kiến đáng kể'
    }
  }
}
