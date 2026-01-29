
import type { GetOrganizationDetailDTO } from '../dtos/request/get_organization_detail_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  organizationCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { canViewOrganization } from '#modules/organizations/access/domain/org_permission_policy'
import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationUserReaderWriter } from '#modules/organizations/directory/actions/ports/outbound/organization_external_dependencies'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/directory/actions/ports/outbound/organization_persistence'
import type { OrganizationPortfolioStatsReader } from '#modules/organizations/directory/actions/ports/outbound/organization_portfolio_stats_reader'

interface OwnerRecord {
  id: string
  email: string
}

interface MemberPreview {
  id: string
  email: string | null
  org_role: string
  joined_at: Date
}

interface OrganizationDetail {
  id: string
  name: string
  slug: string
  owner_id: string
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
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly portfolioStats: OrganizationPortfolioStatsReader,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {}

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
    const logicalCacheKey = dto.getCacheKey()
    const cacheKey = await cacheStore.resolveVersionedKeyBestEffort(
      organizationCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.organizationDetail,
        dto.organizationId
      ),
      logicalCacheKey
    )
    const cached = cacheKey ? await cacheStore.get<OrganizationDetail>(cacheKey) : null
    if (cached) {
      return cached
    }

    // 3. Get organization
    const organization = await this.organizations.findActiveOrFail(dto.organizationId)

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
    if (cacheKey) {
      await cacheStore.setBestEffort(cacheKey, result, cacheTTL)
    }

    return result
  }

  /**
   * Helper: Check if user is member of organization
   */
  private async checkMembership(organizationId: string, userId: string): Promise<void> {
    const isSuperadmin = await this.userReaderWriter.isSystemSuperadmin(userId)
    if (isSuperadmin) {
      return
    }

    const actorMembership = await this.memberships.getContext(
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
  private async getOwner(ownerId: string): Promise<OwnerRecord | null> {
    const owner = await this.userReaderWriter.findUserIdentity(ownerId)
    if (!owner) return null
    return { id: owner.id, email: owner.email ?? '' }
  }

  /**
   * Helper: Get organization stats
   */
  private async getStats(organizationId: string): Promise<{
    member_count: number
    project_count: number
    task_count: number
  }> {
    const [memberCount, projectCount, taskCount] = await Promise.all([
      this.memberships.countMembers(organizationId),
      this.portfolioStats
        .countNonDeletedProjectsByOrganizationIds([organizationId])
        .then((m) => m.get(organizationId) ?? 0),
      this.portfolioStats.countNonDeletedTasksByOrganization(organizationId),
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
    organizationId: string,
    limit: number
  ): Promise<MemberPreview[]> {
    const members = await this.memberships.getMembersPreview(organizationId, limit)
    return members.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      org_role: m.org_role,
      joined_at: m.created_at,
    }))
  }
}
