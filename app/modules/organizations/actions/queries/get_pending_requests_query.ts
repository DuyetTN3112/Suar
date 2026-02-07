
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { enforcePolicy } from '#modules/authorization/actions/public_api'
import CacheService from '#modules/cache/infra/cache_service'
import loggerService from '#modules/logger/infra/logger_service'
import { canViewPendingJoinRequests } from '#modules/organizations/domain/org_permission_policy'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

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
    email: string | null
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
    await this.checkPermission(userId, organizationId)

    // 2. Try cache first
    const cacheKey = this.buildCacheKey(organizationId)
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 3. Query pending memberships from organization_users
    const pendingMembers =
      await listingQueries.findPendingMembersWithDetails(organizationId)

    // 4. Format response
    const result: RequestResult[] = pendingMembers
      .filter((member) => member.invited_by === null)
      .map((member) => ({
        id: member.user_id,
        user_id: member.user_id,
        organization_id: member.organization_id,
        organization_name: member.organization.name,
        message: '',
        status: member.status,
        created_at: member.created_at.toJSDate(),
        updated_at: member.updated_at.toJSDate(),
        user: {
          id: member.user_id,
          username: member.user.username,
          email: member.user.email,
        },
      }))

    // 5. Cache result (1 minute - very volatile data)
    await this.saveToCache(cacheKey, result, 60)

    return result
  }

  /**
   * Check if user has permission (owner or admin)
   */
  private async checkPermission(userId: DatabaseId, organizationId: DatabaseId): Promise<void> {
    const actorMembership = await membershipQueries.getMembershipContext(
      organizationId,
      userId
    )
    const actorOrgRole = actorMembership?.role ?? null
    enforcePolicy(canViewPendingJoinRequests(actorOrgRole))
  }

  /**
   * Build cache key
   */
  private buildCacheKey(organizationId: DatabaseId): string {
    return `organization:pending_requests:org:${organizationId}`
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<RequestResult[] | null> {
    try {
      const cached = await CacheService.get<RequestResult[]>(key)
      if (cached) {
        return cached
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
      await CacheService.set(key, data, ttl)
    } catch (error) {
      loggerService.error('[GetPendingRequestsQuery] Cache set error:', error)
    }
  }
}
