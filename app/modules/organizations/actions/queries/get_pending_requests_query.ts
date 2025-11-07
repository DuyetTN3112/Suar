
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canViewPendingJoinRequests } from '#modules/organizations/domain/org_permission_policy'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'

interface RequestResult {
  id: string
  user_id: string
  organization_id: string
  organization_name: string
  message: string
  status: string
  created_at: Date
  updated_at: Date
  user: {
    id: string
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
  constructor(protected execCtx: OrganizationActionContext) {}

  async execute(organizationId: string): Promise<RequestResult[]> {
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
  private async checkPermission(userId: string, organizationId: string): Promise<void> {
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
  private buildCacheKey(organizationId: string): string {
    return `organization:pending_requests:org:${organizationId}`
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<RequestResult[] | null> {
    try {
      const cached = await cacheStore.get<RequestResult[]>(key)
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
      await cacheStore.set(key, data, ttl)
    } catch (error) {
      loggerService.error('[GetPendingRequestsQuery] Cache set error:', error)
    }
  }
}
