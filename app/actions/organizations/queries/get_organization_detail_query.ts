import type { ExecutionContext } from '#types/execution_context'
import redis from '@adonisjs/redis/services/main'
import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import ProjectRepository from '#infra/projects/repositories/project_repository'
import type { GetOrganizationDetailDTO } from '../dtos/request/get_organization_detail_dto.js'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canViewOrganization } from '#domain/organizations/org_permission_policy'

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
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached) as OrganizationDetail
    }

    // 3. Get organization
    const organization = await OrganizationRepository.findById(dto.organizationId)
    if (!organization) {
      throw NotFoundException.resource('Tổ chức', dto.organizationId)
    }

    const result: OrganizationDetail = organization.toJSON() as OrganizationDetail

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
    await redis.setex(cacheKey, cacheTTL, JSON.stringify(result))

    return result
  }

  /**
   * Helper: Check if user is member of organization
   */
  private async checkMembership(organizationId: DatabaseId, userId: DatabaseId): Promise<void> {
    const actorOrgRole = await OrganizationUserRepository.getMemberRoleName(
      organizationId,
      userId,
      undefined,
      true
    )
    enforcePolicy(canViewOrganization(actorOrgRole))
  }

  /**
   * Helper: Get owner details
   */
  private async getOwner(ownerId: DatabaseId): Promise<OwnerRecord | null> {
    const owner = await UserRepository.findById(ownerId)
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
      OrganizationUserRepository.countMembers(organizationId),
      ProjectRepository.countByOrgIds([organizationId]).then((m) => m.get(organizationId) ?? 0),
      ProjectRepository.countTasksByOrganization(organizationId),
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
    const members = await OrganizationUserRepository.getMembersPreview(organizationId, limit)
    return members.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      org_role: m.org_role,
      joined_at: m.created_at.toJSDate(),
    }))
  }
}
