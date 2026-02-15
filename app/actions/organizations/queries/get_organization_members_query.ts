import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'
import type { GetOrganizationMembersDTO } from '../dtos/get_organization_members_dto.js'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'

interface MemberRecord {
  membership_id: DatabaseId
  user_id: DatabaseId
  role_id: DatabaseId
  role_name: string
  role_display_name: string
  joined_at: Date
  created_at: Date
  username: string
  email: string
  is_active: boolean
}

interface CountRecord {
  count: number | string
}

interface MemberResult {
  membership_id: DatabaseId
  user_id: DatabaseId
  role_id: DatabaseId
  role_name: string
  role_display_name: string
  joined_at: Date
  created_at: Date
  user: {
    id: DatabaseId
    username: string
    email: string
    is_active: boolean
  }
}

interface PaginatedResult {
  data: MemberResult[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

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

  async execute(dto: GetOrganizationMembersDTO): Promise<PaginatedResult> {
    const user = this.ctx.auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const organizationId = dto.organizationId

    // 1. Permission check: User must be member
    const isMember = await this.checkMembership(user.id, organizationId)
    if (!isMember) {
      throw new ForbiddenException('Bạn không có quyền xem danh sách thành viên')
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
      const searchTerm = dto.search
      void query.where((searchQuery) => {
        void searchQuery
          .whereILike('u.username', `%${searchTerm}%`)
          .orWhereILike('u.email', `%${searchTerm}%`)
      })
    }

    // 5. Count total (before pagination)
    const countQuery = query.clone()
    const countResult = (await countQuery.count('* as count')) as CountRecord[]
    const total = Number(countResult[0]?.count ?? 0)

    // 6. Apply pagination
    const offset = dto.getOffset()
    void query.orderBy('ou.joined_at', 'desc').limit(dto.limit).offset(offset)

    // 7. Execute query
    const members = (await query) as MemberRecord[]

    // 8. Calculate meta
    const lastPage = Math.ceil(total / dto.limit)
    const result: PaginatedResult = {
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
  private async checkMembership(userId: DatabaseId, organizationId: DatabaseId): Promise<boolean> {
    const membership: unknown = await db
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
      `org:${String(dto.organizationId)}`,
      `page:${String(dto.page)}`,
      `limit:${String(dto.limit)}`,
    ]

    if (dto.roleId) {
      parts.push(`role:${String(dto.roleId)}`)
    }

    if (dto.search) {
      parts.push(`search:${dto.search}`)
    }

    return parts.join(':')
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<PaginatedResult | null> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        return JSON.parse(cached) as PaginatedResult
      }
    } catch (error) {
      loggerService.error('[GetOrganizationMembersQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: PaginatedResult, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      loggerService.error('[GetOrganizationMembersQuery] Cache set error:', error)
    }
  }
}
