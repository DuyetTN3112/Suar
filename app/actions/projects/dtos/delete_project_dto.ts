/**
 * DTO for deleting a project
 *
 * @implements {DeleteProjectDTOInterface}
 */
export interface DeleteProjectDTOInterface {
  project_id: number
  reason?: string
  permanent?: boolean
}

export class DeleteProjectDTO implements DeleteProjectDTOInterface {
  public readonly project_id: number
  public readonly reason?: string
  public readonly permanent: boolean

  constructor(data: DeleteProjectDTOInterface) {
    this.validateInput(data)

    this.project_id = data.project_id
    this.reason = data.reason?.trim()
    this.permanent = data.permanent || false
  }

  /**
   * Validate input data
   */
  private validateInput(data: DeleteProjectDTOInterface): void {
    // Project ID validation
    if (!data.project_id || data.project_id <= 0) {
      throw new Error('ID dự án không hợp lệ')
    }

    // Reason validation (if provided)
    if (data.reason && data.reason.trim().length > 500) {
      throw new Error('Lý do xóa không được vượt quá 500 ký tự')
    }
  }

  /**
   * Check if this is a permanent delete
   */
  public isPermanentDelete(): boolean {
    return this.permanent
  }

  /**
   * Check if a reason was provided
   */
  public hasReason(): boolean {
    return !!this.reason && this.reason.length > 0
  }

  /**
   * Get audit log message
   */
  public getAuditMessage(): string {
    const deleteType = this.permanent ? 'Xóa vĩnh viễn' : 'Xóa mềm'
    const reasonText = this.hasReason() ? ` - Lý do: ${this.reason}` : ''
    return `${deleteType} dự án ID ${this.project_id}${reasonText}`
  }

  /**
   * Convert to plain object
   */
  public toObject(): Record<string, any> {
    return {
      project_id: this.project_id,
      reason: this.reason,
      permanent: this.permanent,
    }
  }
}
