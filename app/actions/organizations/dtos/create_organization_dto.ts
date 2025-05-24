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
    public readonly website?: string,
    public readonly plan?: string
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
      throw new Error('Organization name is required')
    }

    const trimmedName = this.name.trim()
    if (trimmedName.length < 3) {
      throw new Error('Organization name must be at least 3 characters')
    }

    if (trimmedName.length > 100) {
      throw new Error('Organization name cannot exceed 100 characters')
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

        // Slug must be lowercase alphanumeric with hyphens only
        if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
          throw new Error(
            'Organization slug must contain only lowercase letters, numbers, and hyphens'
          )
        }

        // Slug cannot start or end with hyphen
        if (trimmedSlug.startsWith('-') || trimmedSlug.endsWith('-')) {
          throw new Error('Organization slug cannot start or end with a hyphen')
        }

        // Slug cannot have consecutive hyphens
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
   * Helper: Generate slug from name
   * Pattern: Auto-generate if not provided (learned from Projects module)
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD') // Normalize Vietnamese characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/đ/g, 'd') // Replace đ with d
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single
  }

  /**
   * Helper: Convert to database object
   * Pattern: Prepare data for Lucid ORM (learned from all modules)
   */
  toObject() {
    return {
      name: this.name.trim(),
      slug: this.slug?.trim() || this.generateSlug(this.name),
      description: this.description?.trim() || null,
      logo: this.logo?.trim() || null,
      website: this.website?.trim() || null,
      plan: this.plan?.toLowerCase() || 'free',
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
    return this.name.trim()
  }

  /**
   * Helper: Get final slug (generated if not provided)
   */
  getFinalSlug(): string {
    return this.slug?.trim() || this.generateSlug(this.name)
  }

  /**
   * Helper: Get display plan name
   */
  getDisplayPlan(): string {
    const plan = this.plan?.toLowerCase() || 'free'
    const planNames: Record<string, string> = {
      free: 'Miễn phí',
      basic: 'Cơ bản',
      premium: 'Cao cấp',
      enterprise: 'Doanh nghiệp',
    }
    return planNames[plan] || 'Miễn phí'
  }
}
