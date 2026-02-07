
import type { GetOrganizationDetailDTO } from '../dtos/request/get_organization_detail_dto.js'
import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import UnauthorizedException from '#exceptions/unauthorized_exception'
import { enforcePolicy } from '#modules/authorization/actions/public_api'
import CacheService from '#modules/cache/infra/cache_service'
import { canViewOrganization } from '#modules/organizations/domain/org_permission_policy'
import * as listingQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/listing_queries'
import * as membershipQueries from '#modules/organizations/infra/repositories/organization_user_repository/read/membership_queries'
import OrganizationRepository from '#modules/organizations/infra/repositories/read/organization_repository'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

interface OwnerRecord {
  id: DatabaseId
  email: string
}

interface MemberPreview {
  id: DatabaseId
  email: string | null
  org_role: string
  joined_at: Date
}

interface OrganizationDetail {
  id: DatabaseId
  name: string
  slug: string
  owner_id: DatabaseId
  owner?: OwnerRecord | null
  stats?: {
    member_count: number
    project_count: number
    task_count: number
  }
  members_preview?: MemberPreview[]
  [key: string]: unknown
}

/**
 * Query: Get Organization Detail
 *
 * Pattern: Detail query with optional includes (learned from Projects module)
 * Features:
 * - Permission check (user must be member)
 * - Optional includes: owner, stats, members_preview
 * - Redis caching (2-5 min TTL based on includes)
 *
 * @example
 * const query = new GetOrganizationDetailQuery(ctx)
 * const org = await query.execute(dto)
 */
export default class GetOrganizationDetailQuery {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute query: Get organization detail
   *
   * Steps:
   * 1. Check user is member
   * 2. Try Redis cache
   * 3. Get organization
   * 4. Load optional includes
   * 5. Cache result
   * 6. Return result
   */
  async execute(dto: GetOrganizationDetailDTO): Promise<OrganizationDetail> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // 1. Check user is member of organization
    await this.checkMembership(dto.organizationId, userId)

    // 2. Try cache first
    const cacheKey = dto.getCacheKey()
    const cached = await CacheService.get<OrganizationDetail>(cacheKey)
    if (cached) {
      return cached
    }

    // 3. Get organization
    const organization = await OrganizationRepository.findActiveOrFailRecord(dto.organizationId)

    const result: OrganizationDetail = { ...organization }

    // 4. Load optional includes
    if (dto.includeOwner) {
      result.owner = await this.getOwner(organization.owner_id)
    }

    if (dto.includeStats) {
      result.stats = await this.getStats(dto.organizationId)
    }

    if (dto.includeMembersPreview) {
      result.members_preview = await this.getMembersPreview(
        dto.organizationId,
        dto.getMembersPreviewLimit()
      )
    }

    // 5. Cache result with dynamic TTL
    const cacheTTL = dto.getCacheTTL()
    await CacheService.set(cacheKey, result, cacheTTL)

    return result
  }

  /**
   * Helper: Check if user is member of organization
   */
  private async checkMembership(organizationId: DatabaseId, userId: DatabaseId): Promise<void> {
    const actorMembership = await membershipQueries.getMembershipContext(
      organizationId,
      userId,
      undefined,
      true
    )
    const actorOrgRole = actorMembership?.role ?? null
    enforcePolicy(canViewOrganization(actorOrgRole))
  }

  /**
   * Helper: Get owner details
   */
  private async getOwner(ownerId: DatabaseId): Promise<OwnerRecord | null> {
    const owner = await DefaultOrganizationDependencies.user.findUserIdentity(ownerId)
    if (!owner) return null
    return { id: owner.id, email: owner.email ?? '' }
  }

  /**
   * Helper: Get organization stats
   */
  private async getStats(organizationId: DatabaseId): Promise<{
    member_count: number
    project_count: number
    task_count: number
  }> {
    const [memberCount, projectCount, taskCount] = await Promise.all([
      listingQueries.countMembers(organizationId),
      DefaultOrganizationDependencies.projectTask
        .countProjectsByOrganizationIds([organizationId])
        .then((m) => m.get(organizationId) ?? 0),
      DefaultOrganizationDependencies.projectTask.countTasksByOrganization(organizationId),
    ])

    return {
      member_count: memberCount,
      project_count: projectCount,
      task_count: taskCount,
    }
  }

  /**
   * Helper: Get members preview (first N members)
   */
  private async getMembersPreview(
    organizationId: DatabaseId,
    limit: number
  ): Promise<MemberPreview[]> {
    const members = await listingQueries.getMembersPreview(organizationId, limit)
    return members.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      org_role: m.org_role,
      joined_at: m.created_at.toJSDate(),
    }))
  }
}
