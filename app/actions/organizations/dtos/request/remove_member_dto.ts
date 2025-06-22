import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'

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
    public readonly organizationId: DatabaseId,
    public readonly userId: DatabaseId,
    public readonly reason?: string
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Organization ID validation (required, UUIDv7 string)
    if (!this.organizationId) {
      throw new ValidationException('Organization ID is required')
    }

    // User ID validation (required, UUIDv7 string)
    if (!this.userId) {
      throw new ValidationException('User ID is required')
    }

    // Reason validation (optional, max 500 characters)
    if (this.reason !== undefined) {
      if (typeof this.reason !== 'string') {
        throw new ValidationException('Removal reason must be a string')
      }

      if (this.reason.trim().length > 500) {
        throw new ValidationException('Removal reason cannot exceed 500 characters')
      }
    }
  }

  /**
   * Helper: Check if removal reason is provided
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
   * Helper: Get human-readable summary
   * Pattern: Audit logging description (learned from Tasks module)
   */
  getSummary(): string {
    const reason = this.hasReason() ? ` (${this.getNormalizedReason() ?? ''})` : ''
    return `Removed user ${this.userId} from organization ${this.organizationId}${reason}`
  }
}
