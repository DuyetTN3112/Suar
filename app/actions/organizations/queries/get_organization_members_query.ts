import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'
import type { GetOrganizationMembersDTO } from '../dtos/get_organization_members_dto.js'

/**
 * Query: Get Organization Members
 *
 * Pattern: Paginated list with filters (learned from Tasks module)
 * Features:
 * - Permission check (must be member)
 * - Filter by role_id
 * - Search by user name/email
 * - Filter by status (active/inactive)
 * - Pagination support
 * - Redis caching (3 min TTL)
 * - Load user details
 *
 * @example
 * const query = new GetOrganizationMembersQuery(ctx)
 * const result = await query.execute(dto)
 * // { data: [...], meta: { total, per_page, current_page, last_page } }
 */
export default class GetOrganizationMembersQuery {
  constructor(protected ctx: HttpContext) {}

  async execute(dto: GetOrganizationMembersDTO): Promise<{
    data: unknown[]
    meta: {
      total: number
      per_page: number
      current_page: number
      last_page: number
    }
  }> {
    const user = this.ctx.auth.user!
    const organizationId = dto.organizationId

    // 1. Permission check: User must be member
    const isMember = await this.checkMembership(user.id, organizationId)
    if (!isMember) {
      throw new Error('Bạn không có quyền xem danh sách thành viên')
    }

    // 2. Try cache first
    const cacheKey = this.buildCacheKey(dto)
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 3. Build query
    const query = db
      .from('organization_users as ou')
      .where('ou.organization_id', organizationId)
      .whereNull('ou.deleted_at')
      .join('users as u', 'ou.user_id', 'u.id')
      .leftJoin('roles as r', 'ou.role_id', 'r.id')
      .select(
        'ou.id as membership_id',
        'ou.user_id',
        'ou.role_id',
        'ou.joined_at',
        'ou.created_at',
        'u.username',
        'u.email',
        'u.is_active',
        'r.name as role_name',
        'r.display_name as role_display_name'
      )

    // 4. Apply filters
    if (dto.roleId) {
      void query.where('ou.role_id', dto.roleId)
    }

    if (dto.search) {
      void query.where((searchQuery) => {
        void searchQuery
          .whereILike('u.username', `%${dto.search}%`)
          .orWhereILike('u.email', `%${dto.search}%`)
      })
    }

    // 5. Count total (before pagination)
    const countQuery = query.clone()
    const [{ count }] = await countQuery.count('* as count')
    const total = Number(count)

    // 6. Apply pagination
    const offset = dto.getOffset()
    void query.orderBy('ou.joined_at', 'desc').limit(dto.limit).offset(offset)

    // 7. Execute query
    const members = await query

    // 8. Calculate meta
    const lastPage = Math.ceil(total / dto.limit)
    const result = {
      data: members.map((member) => ({
        membership_id: member.membership_id,
        user_id: member.user_id,
        role_id: member.role_id,
        role_name: member.role_name,
        role_display_name: member.role_display_name,
        joined_at: member.joined_at,
        created_at: member.created_at,
        user: {
          id: member.user_id,
          username: member.username,
          email: member.email,
          is_active: member.is_active,
        },
      })),
      meta: {
        total,
        per_page: dto.limit,
        current_page: dto.page,
        last_page: lastPage,
      },
    }

    // 9. Cache result
    await this.saveToCache(cacheKey, result, 180) // 3 minutes

    return result
  }

  /**
   * Check if user is member of organization
   */
  private async checkMembership(userId: number, organizationId: number): Promise<boolean> {
    const membership = await db
      .from('organization_users')
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .first()

    return !!membership
  }

  /**
   * Build cache key
   */
  private buildCacheKey(dto: GetOrganizationMembersDTO): string {
    const parts = [
      'organization:members',
      `org:${dto.organizationId}`,
      `page:${dto.page}`,
      `limit:${dto.limit}`,
    ]

    if (dto.roleId) {
      parts.push(`role:${dto.roleId}`)
    }

    if (dto.search) {
      parts.push(`search:${dto.search}`)
    }

    return parts.join(':')
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
      console.error('[GetOrganizationMembersQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      console.error('[GetOrganizationMembersQuery] Cache set error:', error)
    }
  }
}
