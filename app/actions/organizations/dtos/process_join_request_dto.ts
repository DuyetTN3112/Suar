/**
 * DTO for processing a join request (approve or reject)
 *
 * Pattern: Approval workflow (learned from Projects module)
 * Business rules:
 * - Can approve or reject pending requests
 * - Auto-reject if user is blacklisted
 * - Optional reason for rejection
 *
 * @example
 * const dto = new ProcessJoinRequestDTO(1, true, 'Approved')
 */
export class ProcessJoinRequestDTO {
  constructor(
    public readonly requestId: number,
    public readonly approve: boolean,
    public readonly reason?: string
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Request ID validation (required)
    if (!this.requestId || typeof this.requestId !== 'number') {
      throw new Error('Request ID is required')
    }

    if (this.requestId <= 0) {
      throw new Error('Request ID must be a positive number')
    }

    // Approve flag validation (required)
    if (typeof this.approve !== 'boolean') {
      throw new Error('Approve flag must be a boolean')
    }

    // Reason validation (optional, but recommended for rejection)
    if (this.reason !== undefined && this.reason !== null) {
      if (typeof this.reason !== 'string') {
        throw new Error('Processing reason must be a string')
      }

      if (this.reason.trim().length > 500) {
        throw new Error('Processing reason cannot exceed 500 characters')
      }
    }

    // If rejecting, reason is strongly recommended (but not required)
    // Silently allow rejection without reason
  }

  /**
   * Helper: Check if this is an approval
   */
  isApproval(): boolean {
    return this.approve
  }

  /**
   * Helper: Check if this is a rejection
   */
  isRejection(): boolean {
    return !this.approve
  }

  /**
   * Helper: Check if processing reason is provided
   */
  hasReason(): boolean {
    return this.reason !== undefined && this.reason !== null && this.reason.trim().length > 0
  }

  /**
   * Helper: Get normalized reason
   */
  getNormalizedReason(): string | null {
    if (!this.hasReason()) return null
    return this.reason!.trim()
  }

  /**
   * Helper: Get status string for database
   */
  getStatus(): 'approved' | 'rejected' {
    return this.approve ? 'approved' : 'rejected'
  }

  /**
   * Helper: Get action verb for display
   */
  getActionVerb(): string {
    return this.approve ? 'Approved' : 'Rejected'
  }

  /**
   * Helper: Get Vietnamese action verb
   */
  getActionVerbVi(): string {
    return this.approve ? 'Đã phê duyệt' : 'Đã từ chối'
  }

  /**
   * Helper: Convert to database object
   */
  toObject() {
    return {
      status: this.getStatus(),
      reason: this.getNormalizedReason(),
      processed_at: new Date(),
    }
  }

  /**
   * Helper: Get human-readable summary
   * Pattern: Audit logging description (learned from Tasks module)
   */
  getSummary(): string {
    const action = this.getActionVerb()
    const reason = this.hasReason() ? ` (${this.getNormalizedReason()})` : ''
    return `${action} join request ${this.requestId}${reason}`
  }
}
