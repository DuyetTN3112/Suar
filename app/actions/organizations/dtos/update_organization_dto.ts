/**
 * DTO for updating an existing organization
 *
 * Pattern: Partial updates with change tracking (learned from Tasks module)
 * Only provided fields will be updated, others remain unchanged
 *
 * @example
 * const dto = new UpdateOrganizationDTO(1, 'New Name', undefined, 'New description')
 */
export class UpdateOrganizationDTO {
  constructor(
    public readonly organizationId: number,
    public readonly name?: string,
    public readonly slug?: string,
    public readonly description?: string,
    public readonly logo?: string,
    public readonly website?: string,
    public readonly plan?: string
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   * Only validates provided fields (partial update pattern)
   */
  private validate(): void {
    // Organization ID validation (required)
    if (!this.organizationId || typeof this.organizationId !== 'number') {
      throw new Error('Organization ID is required')
    }

    if (this.organizationId <= 0) {
      throw new Error('Organization ID must be a positive number')
    }

    // At least one field must be provided for update
    if (!this.hasUpdates()) {
      throw new Error('At least one field must be provided for update')
    }

    // Name validation (optional, 3-100 characters if provided)
    if (this.name !== undefined && this.name !== null) {
      if (typeof this.name !== 'string') {
        throw new Error('Organization name must be a string')
      }

      const trimmedName = this.name.trim()
      if (trimmedName.length > 0) {
        if (trimmedName.length < 3) {
          throw new Error('Organization name must be at least 3 characters')
        }

        if (trimmedName.length > 100) {
          throw new Error('Organization name cannot exceed 100 characters')
        }
      }
    }

    // Slug validation (optional, but must be valid if provided)
    if (this.slug !== undefined && this.slug !== null) {
      if (typeof this.slug !== 'string') {
        throw new Error('Organization slug must be a string')
      }

      const trimmedSlug = this.slug.trim()
      if (trimmedSlug.length > 0) {
        if (trimmedSlug.length < 3) {
          throw new Error('Organization slug must be at least 3 characters')
        }

        if (trimmedSlug.length > 100) {
          throw new Error('Organization slug cannot exceed 100 characters')
        }

        if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
          throw new Error(
            'Organization slug must contain only lowercase letters, numbers, and hyphens'
          )
        }

        if (trimmedSlug.startsWith('-') || trimmedSlug.endsWith('-')) {
          throw new Error('Organization slug cannot start or end with a hyphen')
        }

        if (trimmedSlug.includes('--')) {
          throw new Error('Organization slug cannot contain consecutive hyphens')
        }
      }
    }

    // Description validation (optional, max 500 characters)
    if (this.description !== undefined && this.description !== null) {
      if (typeof this.description !== 'string') {
        throw new Error('Organization description must be a string')
      }

      if (this.description.trim().length > 500) {
        throw new Error('Organization description cannot exceed 500 characters')
      }
    }

    // Logo validation (optional, must be valid URL)
    if (this.logo !== undefined && this.logo !== null) {
      if (typeof this.logo !== 'string') {
        throw new Error('Organization logo must be a string')
      }

      const trimmedLogo = this.logo.trim()
      if (trimmedLogo.length > 0 && !this.isValidUrl(trimmedLogo)) {
        throw new Error('Organization logo must be a valid URL')
      }
    }

    // Website validation (optional, must be valid URL)
    if (this.website !== undefined && this.website !== null) {
      if (typeof this.website !== 'string') {
        throw new Error('Organization website must be a string')
      }

      const trimmedWebsite = this.website.trim()
      if (trimmedWebsite.length > 0 && !this.isValidUrl(trimmedWebsite)) {
        throw new Error('Organization website must be a valid URL')
      }
    }

    // Plan validation (optional, must be valid plan type)
    if (this.plan !== undefined && this.plan !== null) {
      if (typeof this.plan !== 'string') {
        throw new Error('Organization plan must be a string')
      }

      const validPlans = ['free', 'basic', 'premium', 'enterprise']
      if (!validPlans.includes(this.plan.toLowerCase())) {
        throw new Error(`Organization plan must be one of: ${validPlans.join(', ')}`)
      }
    }
  }

  /**
   * Helper: Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Helper: Check if any updates are provided
   * Pattern: Change tracking (learned from Tasks module)
   */
  hasUpdates(): boolean {
    return (
      this.name !== undefined ||
      this.slug !== undefined ||
      this.description !== undefined ||
      this.logo !== undefined ||
      this.website !== undefined ||
      this.plan !== undefined
    )
  }

  /**
   * Helper: Get only the fields that should be updated
   * Pattern: Partial update object (learned from Projects module)
   */
  toObject(): Record<string, unknown> {
    const updates: Record<string, unknown> = {}

    if (this.name !== undefined && this.name !== null) {
      const trimmed = this.name.trim()
      if (trimmed.length > 0) {
        updates.name = trimmed
      }
    }

    if (this.slug !== undefined && this.slug !== null) {
      const trimmed = this.slug.trim()
      if (trimmed.length > 0) {
        updates.slug = trimmed
      }
    }

    if (this.description !== undefined) {
      updates.description = this.description?.trim() || null
    }

    if (this.logo !== undefined) {
      updates.logo = this.logo?.trim() || null
    }

    if (this.website !== undefined) {
      updates.website = this.website?.trim() || null
    }

    if (this.plan !== undefined && this.plan !== null) {
      updates.plan = this.plan.toLowerCase()
    }

    return updates
  }

  /**
   * Helper: Get list of changed field names
   * Pattern: Audit logging helper (learned from all modules)
   */
  getChangedFields(): string[] {
    const fields: string[] = []

    if (this.name !== undefined) fields.push('name')
    if (this.slug !== undefined) fields.push('slug')
    if (this.description !== undefined) fields.push('description')
    if (this.logo !== undefined) fields.push('logo')
    if (this.website !== undefined) fields.push('website')
    if (this.plan !== undefined) fields.push('plan')

    return fields
  }

  /**
   * Helper: Get count of changed fields
   */
  getChangedFieldsCount(): number {
    return this.getChangedFields().length
  }

  /**
   * Helper: Check if specific field is being updated
   */
  isFieldUpdating(fieldName: string): boolean {
    return this.getChangedFields().includes(fieldName)
  }

  /**
   * Helper: Get human-readable summary of changes
   * Pattern: Audit logging description (learned from Tasks module)
   */
  getChangesSummary(): string {
    const fields = this.getChangedFields()
    if (fields.length === 0) return 'No changes'
    if (fields.length === 1) return `Updated ${fields[0]}`
    if (fields.length === 2) return `Updated ${fields[0]} and ${fields[1]}`
    return `Updated ${fields.length} fields: ${fields.join(', ')}`
  }
}
