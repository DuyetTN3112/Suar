
import type { GetOrganizationMembersDTO } from '../dtos/request/get_organization_members_dto.js'
import { OrganizationMemberResponseDTO } from '../dtos/response/organization_response_dtos.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import loggerService from '#modules/logger/public_contracts/logger_service'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { canViewOrganizationMembers } from '#modules/organizations/domain/org_permission_policy'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'

interface PaginatedResult {
  data: OrganizationMemberResponseDTO[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

const STATUS_FILTER_TO_MEMBER_STATUS: Record<'active' | 'pending' | 'inactive', string> = {
  active: 'approved',
  pending: 'pending',
  inactive: 'rejected',
}

const ORG_ROLE_LABEL: Record<string, string> = {
  org_owner: 'Owner',
  org_admin: 'Admin',
  org_member: 'Member',
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
  constructor(protected execCtx: OrganizationActionContext) {}

  async execute(dto: GetOrganizationMembersDTO): Promise<PaginatedResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const organizationId = dto.organizationId

    // 1. Permission check: User must be member
    await this.checkMembership(userId, organizationId)

    // 2. Try cache first
    const cacheKey = this.buildCacheKey(dto)
    const cached = await this.getFromCache(cacheKey)
    if (cached) {
      return cached
    }

    // 3. Paginate members → delegate to Model
    const { data, total } = await listingQueries.paginateMembers(organizationId, {
      page: dto.page,
      limit: dto.limit,
      orgRole: dto.roleId,
      search: dto.search,
      statusFilter: dto.statusFilter ? STATUS_FILTER_TO_MEMBER_STATUS[dto.statusFilter] : undefined,
      include: dto.include,
    })

    const mappedData = data.map((member) =>
      OrganizationMemberResponseDTO.fromProps({
        id: member.user_id,
        user_id: member.user_id,
        username: member.user.username,
        email: member.user.email ?? '',
        org_role: member.org_role,
        role_name: ORG_ROLE_LABEL[member.org_role] ?? member.org_role,
        status: member.status,
        joined_at: new Date(member.created_at).toISOString(),
        last_activity_at: member.last_activity_at
          ? new Date(member.last_activity_at).toISOString()
          : null,
      })
    )

    // 4. Calculate meta
    const lastPage = Math.ceil(total / dto.limit)
    const result: PaginatedResult = {
      data: mappedData,
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
  private async checkMembership(userId: string, organizationId: string): Promise<void> {
    const actorMembership = await membershipQueries.getMembershipContext(
      organizationId,
      userId,
      undefined,
      true
    )
    const actorOrgRole = actorMembership?.role ?? null
    enforcePolicy(canViewOrganizationMembers(actorOrgRole))
  }

  /**
   * Build cache key
   */
  private buildCacheKey(dto: GetOrganizationMembersDTO): string {
    return dto.getCacheKey()
  }

  /**
   * Get from Redis cache
   */
  private async getFromCache(key: string): Promise<PaginatedResult | null> {
    try {
      const cached = await cacheStore.get<PaginatedResult>(key)
      if (cached) {
        return cached
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
      await cacheStore.set(key, data, ttl)
    } catch (error) {
      loggerService.error('[GetOrganizationMembersQuery] Cache set error:', error)
    }
  }
}
