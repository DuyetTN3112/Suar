import type { ExecutionContext } from '#types/execution_context'
import redis from '@adonisjs/redis/services/main'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import type { GetOrganizationMembersDTO } from '../dtos/get_organization_members_dto.js'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import type { DateTime } from 'luxon'

interface MemberResult {
  user_id: string
  org_role: string
  status: string
  created_at: DateTime
  user: {
    id: string
    username: string
    email: string | null
    status: string
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
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: GetOrganizationMembersDTO): Promise<PaginatedResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const organizationId = dto.organizationId

    // 1. Permission check: User must be member
    const isMember = await this.checkMembership(userId, organizationId)
    if (!isMember) {
      throw new ForbiddenException('Bạn không có quyền xem danh sách thành viên')
    }

    // 2. Try cache first
    const cacheKey = this.buildCacheKey(dto)
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 3. Paginate members → delegate to Model
    const { data, total } = await OrganizationUserRepository.paginateMembers(organizationId, {
      page: dto.page,
      limit: dto.limit,
      orgRole: dto.roleId,
      search: dto.search,
    })

    // 4. Calculate meta
    const lastPage = Math.ceil(total / dto.limit)
    const result: PaginatedResult = {
      data,
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
    return OrganizationUserRepository.isMember(userId, organizationId)
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
