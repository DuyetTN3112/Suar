/**
 * DTO for getting organization detail with optional includes
 *
 * Pattern: Detail query with includes (learned from Projects module)
 * Supports loading related data: owner, members count, projects count
 *
 * @example
 * const dto = new GetOrganizationDetailDTO(1, true, true, true)
 */
export class GetOrganizationDetailDTO {
  constructor(
    public readonly organizationId: number,
    public readonly includeOwner: boolean = true,
    public readonly includeStats: boolean = true,
    public readonly includeMembersPreview: boolean = false
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

    // Include flags validation (must be boolean)
    if (typeof this.includeOwner !== 'boolean') {
      throw new Error('Include owner flag must be a boolean')
    }

    if (typeof this.includeStats !== 'boolean') {
      throw new Error('Include stats flag must be a boolean')
    }

    if (typeof this.includeMembersPreview !== 'boolean') {
      throw new Error('Include members preview flag must be a boolean')
    }
  }

  /**
   * Helper: Check if any includes are active
   */
  hasIncludes(): boolean {
    return this.includeOwner || this.includeStats || this.includeMembersPreview
  }

  /**
   * Helper: Get list of active includes
   */
  getActiveIncludes(): string[] {
    const includes: string[] = []
    if (this.includeOwner) includes.push('owner')
    if (this.includeStats) includes.push('stats')
    if (this.includeMembersPreview) includes.push('members_preview')
    return includes
  }

  /**
   * Helper: Get cache key for Redis
   * Pattern: Cache key generation (learned from Projects module)
   */
  getCacheKey(): string {
    const includes = this.getActiveIncludes().join(',')
    return `org:detail:${this.organizationId}:includes:${includes || 'none'}`
  }

  /**
   * Helper: Get cache TTL based on includes (in seconds)
   * More includes = shorter TTL (more volatile data)
   */
  getCacheTTL(): number {
    if (this.includeStats) return 120 // 2 minutes (stats change frequently)
    if (this.includeMembersPreview) return 180 // 3 minutes
    return 300 // 5 minutes (basic info)
  }

  /**
   * Helper: Get members preview limit
   */
  getMembersPreviewLimit(): number {
    return 5 // Show first 5 members
  }
}
