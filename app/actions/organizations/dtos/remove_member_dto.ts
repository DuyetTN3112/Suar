/**
 * DTO for removing a member from an organization
 *
 * Pattern: Validation with business rules (learned from Projects module)
 * Business rules:
 * - Cannot remove Owner (role_id = 1)
 * - Must handle task reassignment for members with assigned tasks
 *
 * @example
 * const dto = new RemoveMemberDTO(1, 100, 'No longer needed')
 */
export class RemoveMemberDTO {
  constructor(
    public readonly organizationId: number,
    public readonly userId: number,
    public readonly reason?: string
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Organization ID validation (required)
    if (!this.organizationId || typeof this.organizationId !== 'number') {
      throw new Error('Organization ID is required')
    }

    if (this.organizationId <= 0) {
      throw new Error('Organization ID must be a positive number')
    }

    // User ID validation (required)
    if (!this.userId || typeof this.userId !== 'number') {
      throw new Error('User ID is required')
    }

    if (this.userId <= 0) {
      throw new Error('User ID must be a positive number')
    }

    // Reason validation (optional, max 500 characters)
    if (this.reason !== undefined && this.reason !== null) {
      if (typeof this.reason !== 'string') {
        throw new Error('Removal reason must be a string')
      }

      if (this.reason.trim().length > 500) {
        throw new Error('Removal reason cannot exceed 500 characters')
      }
    }
  }

  /**
   * Helper: Check if removal reason is provided
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
   * Helper: Get human-readable summary
   * Pattern: Audit logging description (learned from Tasks module)
   */
  getSummary(): string {
    const reason = this.hasReason() ? ` (${this.getNormalizedReason()})` : ''
    return `Removed user ${this.userId} from organization ${this.organizationId}${reason}`
  }
}
