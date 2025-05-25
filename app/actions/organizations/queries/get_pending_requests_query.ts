import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'

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
  constructor(protected ctx: HttpContext) {}

  async execute(organizationId: number): Promise<unknown[]> {
    const user = this.ctx.auth.user!

    // 1. Permission check: Must be owner or admin
    const hasPermission = await this.checkPermission(user.id, organizationId)
    if (!hasPermission) {
      throw new Error('Bạn không có quyền xem danh sách yêu cầu tham gia')
    }

    // 2. Try cache first
    const cacheKey = this.buildCacheKey(organizationId)
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 3. Query pending requests
    // Note: Assuming there's a join_requests table
    // If it doesn't exist, this will need to be adjusted based on actual schema
    const requests = await db
      .from('organization_join_requests as ojr')
      .where('ojr.organization_id', organizationId)
      .where('ojr.status', 'pending')
      .whereNull('ojr.deleted_at')
      .join('users as u', 'ojr.user_id', 'u.id')
      .leftJoin('organizations as o', 'ojr.organization_id', 'o.id')
      .select(
        'ojr.id as request_id',
        'ojr.user_id',
        'ojr.organization_id',
        'ojr.message',
        'ojr.status',
        'ojr.created_at',
        'ojr.updated_at',
        'u.username',
        'u.email',
        'o.name as organization_name'
      )
      .orderBy('ojr.created_at', 'desc')

    // 4. Format response
    const result = requests.map((request) => ({
      id: request.request_id,
      user_id: request.user_id,
      organization_id: request.organization_id,
      organization_name: request.organization_name,
      message: request.message,
      status: request.status,
      created_at: request.created_at,
      updated_at: request.updated_at,
      user: {
        id: request.user_id,
        username: request.username,
        email: request.email,
      },
    }))

    // 5. Cache result (1 minute - very volatile data)
    await this.saveToCache(cacheKey, result, 60)

    return result
  }

  /**
   * Check if user has permission (owner or admin)
   */
  private async checkPermission(userId: number, organizationId: number): Promise<boolean> {
    const membership = await db
      .from('organization_users')
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .whereIn('role_id', [1, 2]) // 1 = Owner, 2 = Admin
      .whereNull('deleted_at')
      .first()

    return !!membership
  }

  /**
   * Build cache key
   */
  private buildCacheKey(organizationId: number): string {
    return `organization:pending_requests:org:${organizationId}`
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
      console.error('[GetPendingRequestsQuery] Cache get error:', error)
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
      console.error('[GetPendingRequestsQuery] Cache set error:', error)
    }
  }
}
