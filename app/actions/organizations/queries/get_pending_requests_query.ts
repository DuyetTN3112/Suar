import type { ExecutionContext } from '#types/execution_context'
import redis from '@adonisjs/redis/services/main'
import OrganizationUser from '#models/organization_user'
import OrganizationJoinRequest from '#models/organization_join_request'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'

interface RequestResult {
  id: DatabaseId
  user_id: DatabaseId
  organization_id: DatabaseId
  organization_name: string
  message: string
  status: string
  created_at: Date
  updated_at: Date
  user: {
    id: DatabaseId
    username: string
    email: string
  }
}

/**
 * Query: Get Pending Join Requests
 *
 * Pattern: Simple filtered list (learned from Tasks module)
 * Features:
 * - Permission check (Owner/Admin only)
 * - Only pending requests (status = 'pending')
 * - Load user details
 * - Redis caching (1 min TTL - volatile data)
 * - Sorted by newest first
 *
 * Business Rules:
 * - Only owner and admins can view pending requests
 * - Only shows requests with status = 'pending'
 * - Approved/rejected requests are hidden
 *
 * @example
 * const query = new GetPendingRequestsQuery(ctx)
 * const requests = await query.execute(organizationId)
 */
export default class GetPendingRequestsQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(organizationId: DatabaseId): Promise<RequestResult[]> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Unauthorized')
    }

    // 1. Permission check: Must be owner or admin
    const hasPermission = await this.checkPermission(userId, organizationId)
    if (!hasPermission) {
      throw new ForbiddenException('Bạn không có quyền xem danh sách yêu cầu tham gia')
    }

    // 2. Try cache first
    const cacheKey = this.buildCacheKey(organizationId)
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 3. Query pending requests via Model
    const requests = await OrganizationJoinRequest.getPendingByOrganization(organizationId)

    // 4. Format response
    const result: RequestResult[] = requests.map((request) => ({
      id: request.id,
      user_id: request.user_id,
      organization_id: request.organization_id,
      organization_name: request.organization?.name ?? '',
      message: request.message,
      status: request.status,
      created_at: request.created_at?.toJSDate() ?? new Date(),
      updated_at: request.updated_at?.toJSDate() ?? new Date(),
      user: {
        id: request.user_id,
        username: request.user?.username ?? '',
        email: request.user?.email ?? '',
      },
    }))

    // 5. Cache result (1 minute - very volatile data)
    await this.saveToCache(cacheKey, result, 60)

    return result
  }

  /**
   * Check if user has permission (owner or admin)
   */
  private async checkPermission(userId: DatabaseId, organizationId: DatabaseId): Promise<boolean> {
    return OrganizationUser.isAdminOrOwnerByRoleId(userId, organizationId)
  }

  /**
   * Build cache key
   */
  private buildCacheKey(organizationId: DatabaseId): string {
    return `organization:pending_requests:org:${String(organizationId)}`
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<RequestResult[] | null> {
    try {
      const cached = await redis.get(key)
      if (cached) {
        return JSON.parse(cached) as RequestResult[]
      }
    } catch (error) {
      loggerService.error('[GetPendingRequestsQuery] Cache get error:', error)
    }
    return null
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: RequestResult[], ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data))
    } catch (error) {
      loggerService.error('[GetPendingRequestsQuery] Cache set error:', error)
    }
  }
}
