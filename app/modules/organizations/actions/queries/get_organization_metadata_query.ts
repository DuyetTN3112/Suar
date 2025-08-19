import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import loggerService from '#modules/logger/public_contracts/logger_service'
import { OrganizationRole } from '#modules/organizations/public_contracts/organization_constants'

interface RoleRecord {
  name: string
  display_name: string
  description: string | null
}

interface PlanRecord {
  name: string
  display_name: string
  description: string
  features: string[]
}

interface MetadataResult {
  roles: RoleRecord[]
  plans: PlanRecord[]
}

/**
 * Query: Get Organization Metadata
 *
 * Pattern: Static dropdown data (learned from Tasks module)
 * Features:
 * - Roles list (for member assignment)
 * - Legacy plan field is intentionally not exposed as product metadata
 * - Redis caching (10 min TTL - very static data)
 * - No permission check (public metadata)
 *
 * Use cases:
 * - Dropdown data for forms
 * - Role selection when inviting users
 *
 * @example
 * const query = new GetOrganizationMetadataQuery(ctx)
 * const metadata = await query.execute()
 * // { roles: [...], plans: [...] }
 */
export default class GetOrganizationMetadataQuery {
  async execute(): Promise<MetadataResult> {
    // Try cache first
    const cacheKey = 'organization:metadata'
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Load metadata
    const roles = this.loadRoles()
    const plans = this.loadPlans()

    const result: MetadataResult = {
      roles,
      plans,
    }

    // Cache result (10 minutes - static data)
    await this.saveToCache(cacheKey, result, 600)

    return result
  }

  /**
   * v3: Return static role constants — no DB query needed
   */
  private loadRoles(): RoleRecord[] {
    return [
      { name: OrganizationRole.OWNER, display_name: 'Owner', description: 'Chủ tổ chức' },
      { name: OrganizationRole.ADMIN, display_name: 'Admin', description: 'Quản trị viên' },
      { name: OrganizationRole.MEMBER, display_name: 'Member', description: 'Thành viên' },
    ]
  }

  /**
   * organizations.plan hiện chưa được dùng như product package cho organization.
   * Giữ field `plans` rỗng để tránh làm UI hiểu sai.
   */
  private loadPlans(): PlanRecord[] {
    return []
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<MetadataResult | null> {
    try {
      const cached = await cacheStore.get<MetadataResult>(key)
      if (cached) {
        return cached
      }
    } catch (error) {
      loggerService.error('[GetOrganizationMetadataQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: MetadataResult, ttl: number): Promise<void> {
    try {
      await cacheStore.set(key, data, ttl)
    } catch (error) {
      loggerService.error('[GetOrganizationMetadataQuery] Cache set error:', error)
    }
  }
}
