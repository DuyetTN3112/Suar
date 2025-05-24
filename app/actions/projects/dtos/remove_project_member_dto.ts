/**
 * DTO for removing a member from a project
 *
 * @implements {RemoveProjectMemberDTOInterface}
 */
export interface RemoveProjectMemberDTOInterface {
  project_id: number
  user_id: number
  reason?: string
  reassign_to?: number
}

export class RemoveProjectMemberDTO implements RemoveProjectMemberDTOInterface {
  public readonly project_id: number
  public readonly user_id: number
  public readonly reason?: string
  public readonly reassign_to?: number

  constructor(data: RemoveProjectMemberDTOInterface) {
    this.validateInput(data)

    this.project_id = data.project_id
    this.user_id = data.user_id
    this.reason = data.reason?.trim()
    this.reassign_to = data.reassign_to
  }

  /**
   * Validate input data
   */
  private validateInput(data: RemoveProjectMemberDTOInterface): void {
    // Project ID validation
    if (!data.project_id || data.project_id <= 0) {
      throw new Error('ID dự án không hợp lệ')
    }

    // User ID validation
    if (!data.user_id || data.user_id <= 0) {
      throw new Error('ID người dùng không hợp lệ')
    }

    // Reason validation (if provided)
    if (data.reason && data.reason.trim().length > 500) {
      throw new Error('Lý do xóa không được vượt quá 500 ký tự')
    }

    // Reassign_to validation (if provided)
    if (data.reassign_to !== undefined) {
      if (data.reassign_to <= 0) {
        throw new Error('ID người được chỉ định không hợp lệ')
      }

      if (data.reassign_to === data.user_id) {
        throw new Error('Không thể chỉ định công việc cho chính người bị xóa')
      }
    }
  }

  /**
   * Check if a reason was provided
   */
  public hasReason(): boolean {
    return !!this.reason && this.reason.length > 0
  }

  /**
   * Check if tasks should be reassigned
   */
  public shouldReassignTasks(): boolean {
    return this.reassign_to !== undefined && this.reassign_to > 0
  }

  /**
   * Get audit log message
   */
  public getAuditMessage(userName?: string, reassignUserName?: string): string {
    const userInfo = userName || `User ID ${this.user_id}`
    let message = `Xóa ${userInfo} khỏi dự án`

    if (this.hasReason()) {
      message += ` - Lý do: ${this.reason}`
    }

    if (this.shouldReassignTasks() && reassignUserName) {
      message += ` - Chuyển công việc cho: ${reassignUserName}`
    }

    return message
  }

  /**
   * Convert to plain object
   */
  public toObject(): Record<string, any> {
    return {
      project_id: this.project_id,
      user_id: this.user_id,
      reason: this.reason,
      reassign_to: this.reassign_to,
    }
  }
}
