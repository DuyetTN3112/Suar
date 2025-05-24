/**
 * DTO for deleting an organization
 *
 * Pattern: Soft delete with reason tracking (learned from Tasks module)
 * Supports both soft delete (default) and permanent delete
 *
 * @example
 * const dto = new DeleteOrganizationDTO(1, false, 'Company dissolved')
 */
export class DeleteOrganizationDTO {
  constructor(
    public readonly organizationId: number,
    public readonly permanent: boolean = false,
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

    // Permanent flag validation
    if (typeof this.permanent !== 'boolean') {
      throw new Error('Permanent flag must be a boolean')
    }

    // Reason validation (optional, max 500 characters)
    if (this.reason !== undefined && this.reason !== null) {
      if (typeof this.reason !== 'string') {
        throw new Error('Deletion reason must be a string')
      }

      if (this.reason.trim().length > 500) {
        throw new Error('Deletion reason cannot exceed 500 characters')
      }
    }
  }

  /**
   * Helper: Check if this is a soft delete
   */
  isSoftDelete(): boolean {
    return !this.permanent
  }

  /**
   * Helper: Check if this is a permanent delete
   */
  isPermanentDelete(): boolean {
    return this.permanent
  }

  /**
   * Helper: Check if deletion reason is provided
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
   * Helper: Get deletion type as string
   */
  getDeletionType(): string {
    return this.permanent ? 'permanent' : 'soft'
  }

  /**
   * Helper: Get human-readable summary
   * Pattern: Audit logging description (learned from Tasks module)
   */
  getSummary(): string {
    const type = this.permanent ? 'Permanently deleted' : 'Deleted'
    const reason = this.hasReason() ? ` (${this.getNormalizedReason()})` : ''
    return `${type} organization${reason}`
  }
}
