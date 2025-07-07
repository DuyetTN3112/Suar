import { OrganizationUserStatus } from '#constants/organization_constants'
import ValidationException from '#exceptions/validation_exception'
import type { DatabaseId } from '#types/database'

/**
 * DTO for processing a join request (approve or reject)
 *
 * v3.0: Uses organizationId + targetUserId (composite key in organization_users)
 * instead of a single requestId from organization_join_requests.
 *
 * @example
 * const dto = new ProcessJoinRequestDTO('org-id', 'user-id', true, 'Approved')
 */
export class ProcessJoinRequestDTO {
  constructor(
    public readonly organizationId: DatabaseId,
    public readonly targetUserId: DatabaseId,
    public readonly approve: boolean,
    public readonly reason?: string
  ) {
    this.validate()
  }

  private validate(): void {
    if (!this.organizationId) {
      throw new ValidationException('Organization ID is required')
    }

    if (!this.targetUserId) {
      throw new ValidationException('Target user ID is required')
    }

    if (typeof this.approve !== 'boolean') {
      throw new ValidationException('Approve flag must be a boolean')
    }

    if (this.reason !== undefined) {
      if (typeof this.reason !== 'string') {
        throw new ValidationException('Processing reason must be a string')
      }

      if (this.reason.trim().length > 500) {
        throw new ValidationException('Processing reason cannot exceed 500 characters')
      }
    }
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
    return this.reason !== undefined && this.reason.trim().length > 0
  }

  /**
   * Helper: Get normalized reason
   */
  getNormalizedReason(): string | null {
    if (!this.hasReason()) return null
    return this.reason?.trim() ?? null
  }

  /**
   * Helper: Get status string for database
   */
  getStatus(): OrganizationUserStatus.APPROVED | OrganizationUserStatus.REJECTED {
    return this.approve ? OrganizationUserStatus.APPROVED : OrganizationUserStatus.REJECTED
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
    const reason = this.hasReason() ? ` (${this.getNormalizedReason() ?? ''})` : ''
    return `${action} join request for user ${this.targetUserId} in org ${this.organizationId}${reason}`
  }
}
