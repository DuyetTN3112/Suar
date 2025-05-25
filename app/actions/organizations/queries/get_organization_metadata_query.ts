import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'

/**
 * Query: Get Organization Metadata
 *
 * Pattern: Static dropdown data (learned from Tasks module)
 * Features:
 * - Roles list (for member assignment)
 * - Plans list (for organization settings)
 * - Redis caching (10 min TTL - very static data)
 * - No permission check (public metadata)
 *
 * Use cases:
 * - Dropdown data for forms
 * - Role selection when inviting users
 * - Plan selection when creating/updating org
 *
 * @example
 * const query = new GetOrganizationMetadataQuery(ctx)
 * const metadata = await query.execute()
 * // { roles: [...], plans: [...] }
 */
export default class GetOrganizationMetadataQuery {
  constructor(protected ctx: HttpContext) {}

  async execute(): Promise<{
    roles: Array<{
      id: number
      name: string
      display_name: string
      description: string | null
    }>
    plans: Array<{
      name: string
      display_name: string
      description: string
      features: string[]
    }>
  }> {
    // Try cache first
    const cacheKey = 'organization:metadata'
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // Load metadata in parallel
    const [roles, plans] = await Promise.all([this.loadRoles(), this.loadPlans()])

    const result = {
      roles,
      plans,
    }

    // Cache result (10 minutes - static data)
    await this.saveToCache(cacheKey, result, 600)

    return result
  }

  /**
   * Load all roles
   */
  private async loadRoles(): Promise<
    Array<{
      id: number
      name: string
      display_name: string
      description: string | null
    }>
  > {
    const roles = await db
      .from('roles')
      .select('id', 'name', 'display_name', 'description')
      .orderBy('id', 'asc')

    return roles
  }

  /**
   * Load all plans (hardcoded since plans are usually static)
   */
  private async loadPlans(): Promise<
    Array<{
      name: string
      display_name: string
      description: string
      features: string[]
    }>
  > {
    // This could be from database if you have a plans table
    // For now, returning hardcoded common plans
    return [
      {
        name: 'free',
        display_name: 'Miễn phí',
        description: 'Phù hợp cho cá nhân và nhóm nhỏ',
        features: ['Tối đa 5 thành viên', 'Tối đa 10 dự án', 'Lưu trữ 1GB', 'Hỗ trợ cơ bản'],
      },
      {
        name: 'starter',
        display_name: 'Starter',
        description: 'Phù hợp cho startup và doanh nghiệp nhỏ',
        features: [
          'Tối đa 20 thành viên',
          'Dự án không giới hạn',
          'Lưu trữ 10GB',
          'Hỗ trợ ưu tiên',
          'Báo cáo nâng cao',
        ],
      },
      {
        name: 'business',
        display_name: 'Business',
        description: 'Phù hợp cho doanh nghiệp vừa và lớn',
        features: [
          'Tối đa 100 thành viên',
          'Dự án không giới hạn',
          'Lưu trữ 100GB',
          'Hỗ trợ 24/7',
          'Báo cáo nâng cao',
          'Tích hợp API',
          'SSO',
        ],
      },
      {
        name: 'enterprise',
        display_name: 'Enterprise',
        description: 'Phù hợp cho tập đoàn và doanh nghiệp lớn',
        features: [
          'Thành viên không giới hạn',
          'Dự án không giới hạn',
          'Lưu trữ không giới hạn',
          'Hỗ trợ 24/7 với dedicated manager',
          'Báo cáo tùy chỉnh',
          'Tích hợp API không giới hạn',
          'SSO & SAML',
          'Audit logs',
          'On-premise deployment',
        ],
      },
    ]
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<unknown> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      console.error('[GetOrganizationMetadataQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: any, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      console.error('[GetOrganizationMetadataQuery] Cache set error:', error)
    }
  }
}
