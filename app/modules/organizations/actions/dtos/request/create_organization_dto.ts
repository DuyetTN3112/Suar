import ValidationException from '#exceptions/validation_exception'
import {
  normalizeOrganizationName,
  resolveOrganizationBaseSlug,
} from '#modules/organizations/domain/organization_rules'

/**
 * DTO for creating a new organization
 *
 * Pattern: Construction-time validation (learned from Tasks/Projects/Users/Auth modules)
 * Naming: User intent focus (CreateOrganization, not just "Create")
 *
 * @example
 * const dto = new CreateOrganizationDTO('Acme Corp', 'acme-corp', 'Tech company')
 */
export class CreateOrganizationDTO {
  constructor(
    public readonly name: string,
    public readonly slug?: string,
    public readonly description?: string,
    public readonly logo?: string,
    public readonly website?: string
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   * Throws descriptive errors for validation failures
   */
  private validate(): void {
    // Name validation (required, 3-100 characters)
    if (!this.name || typeof this.name !== 'string') {
      throw new ValidationException('Organization name is required')
    }

    const trimmedName = this.name.trim()
    if (trimmedName.length < 3) {
      throw new ValidationException('Organization name must be at least 3 characters')
    }

    if (trimmedName.length > 100) {
      throw new ValidationException('Organization name cannot exceed 100 characters')
    }

    // Slug validation (optional, but must be valid if provided)
    if (this.slug !== undefined) {
      if (typeof this.slug !== 'string') {
        throw new ValidationException('Organization slug must be a string')
      }

      const trimmedSlug = this.slug.trim()
      if (trimmedSlug.length > 0) {
        if (trimmedSlug.length < 3) {
          throw new ValidationException('Organization slug must be at least 3 characters')
        }

        if (trimmedSlug.length > 100) {
          throw new ValidationException('Organization slug cannot exceed 100 characters')
        }

        // Slug must be lowercase alphanumeric with hyphens only
        if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
          throw new ValidationException(
            'Organization slug must contain only lowercase letters, numbers, and hyphens'
          )
        }

        // Slug cannot start or end with hyphen
        if (trimmedSlug.startsWith('-') || trimmedSlug.endsWith('-')) {
          throw new ValidationException('Organization slug cannot start or end with a hyphen')
        }

        // Slug cannot have consecutive hyphens
        if (trimmedSlug.includes('--')) {
          throw new ValidationException('Organization slug cannot contain consecutive hyphens')
        }
      }
    }

    // Description validation (optional, max 500 characters)
    if (this.description !== undefined) {
      if (typeof this.description !== 'string') {
        throw new ValidationException('Organization description must be a string')
      }

      if (this.description.trim().length > 500) {
        throw new ValidationException('Organization description cannot exceed 500 characters')
      }
    }

    // Logo validation (optional, must be valid URL)
    if (this.logo !== undefined) {
      if (typeof this.logo !== 'string') {
        throw new ValidationException('Organization logo must be a string')
      }

      const trimmedLogo = this.logo.trim()
      if (trimmedLogo.length > 0 && !this.isValidUrl(trimmedLogo)) {
        throw new ValidationException('Organization logo must be a valid URL')
      }
    }

    // Website validation (optional, must be valid URL)
    if (this.website !== undefined) {
      if (typeof this.website !== 'string') {
        throw new ValidationException('Organization website must be a string')
      }

      const trimmedWebsite = this.website.trim()
      if (trimmedWebsite.length > 0 && !this.isValidUrl(trimmedWebsite)) {
        throw new ValidationException('Organization website must be a valid URL')
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
   * Helper: Generate slug from name
   * Pattern: Auto-generate if not provided (learned from Projects module)
   */
  toObject() {
    return {
      name: normalizeOrganizationName(this.name),
      slug: resolveOrganizationBaseSlug({ name: this.name, slug: this.slug }),
      description: this.description?.trim() ?? null,
      logo: this.logo?.trim() ?? null,
      website: this.website?.trim() ?? null,
    }
  }

  /**
   * Helper: Check if organization data is valid for creation
   * Pattern: Additional validation helper (learned from Tasks module)
   */
  isValid(): boolean {
    try {
      this.validate()
      return true
    } catch {
      return false
    }
  }

  /**
   * Helper: Get normalized name for display
   */
  getNormalizedName(): string {
    return normalizeOrganizationName(this.name)
  }

  /**
   * Helper: Get final slug (generated if not provided)
   */
  getFinalSlug(): string {
    return resolveOrganizationBaseSlug({ name: this.name, slug: this.slug })
  }
}
