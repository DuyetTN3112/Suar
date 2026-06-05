import type { GetOrganizationMembersDTO } from '../../dtos/request/members/get_organization_members_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  organizationCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { canViewOrganizationMembers } from '#modules/organizations/domain/access/org_permission_policy'
import { ORGANIZATION_MEMBER_STATUS_FILTER_TO_MEMBERSHIP_STATUS } from '#modules/organizations/public_contracts/access/organization_constants'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import { OrganizationMemberResponseDTO } from '#modules/organizations/actions/dtos/response/members/organization_member_response_dto'
import {
  disabledOrganizationMemberSearchCandidateReader,
  type OrganizationMemberSearchCandidateReader,
} from '#modules/organizations/actions/ports/outbound/members/organization_member_search_candidate_reader'
import type { OrganizationMembershipRepository } from '#modules/organizations/actions/ports/outbound/members/organization_persistence'
import { buildPaginationMeta } from '#modules/pagination/public_contracts/pagination_public_api'
import { searchFallbackObserver } from '#modules/search/public_contracts/search_fallback_observer'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


interface PaginatedResult {
  data: OrganizationMemberResponseDTO[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}

export interface GetOrganizationMembersQueryDeps {
  searchCandidateReader: OrganizationMemberSearchCandidateReader
  paginateMembers: OrganizationMembershipRepository['paginateMembers']
  getMembershipContext: OrganizationMembershipRepository['getContext']
  resolveCacheKey: (namespaces: readonly string[], logicalKey: string) => Promise<string | null>
  getCache: (key: string) => Promise<PaginatedResult | null>
  setCache: (key: string, data: PaginatedResult, ttl: number) => Promise<void>
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
  private readonly deps: GetOrganizationMembersQueryDeps

  constructor(
    protected execCtx: OrganizationActionContext,
    memberships: OrganizationMembershipRepository,
    deps: Partial<GetOrganizationMembersQueryDeps> = {}
  ) {
    this.deps = {
      searchCandidateReader: disabledOrganizationMemberSearchCandidateReader,
      paginateMembers: memberships.paginateMembers.bind(memberships),
      getMembershipContext: memberships.getContext.bind(memberships),
      resolveCacheKey: (namespaces, logicalKey) =>
        cacheStore.resolveVersionedKeyBestEffort(namespaces, logicalKey),
      getCache: (key) => cacheStore.get<PaginatedResult>(key),
      setCache: async (key, data, ttl) => {
        await cacheStore.setBestEffort(key, data, ttl)
      },
      ...deps,
    }
  }

  async execute(dto: GetOrganizationMembersDTO): Promise<PaginatedResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const organizationId = dto.organizationId

    // 1. Permission check: User must be member
    await this.checkMembership(userId, organizationId)

    // 2. Try cache first
    const logicalCacheKey = this.buildCacheKey(dto)
    const cacheKey = await this.deps.resolveCacheKey(
      organizationCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.organizationMembers,
        organizationId
      ),
      logicalCacheKey
    )
    const cached = cacheKey ? await this.getFromCache(cacheKey) : null
    if (cached) {
      return cached
    }

    // 3. Paginate members → delegate to Model
    const userIds = await this.resolveEngineUserIds(dto)
    const { data, total } = await this.deps.paginateMembers(
      organizationId,
      omitUndefined({
        page: dto.page,
        limit: dto.limit,
        orgRole: dto.roleId,
        userIds: userIds ?? undefined,
        search: userIds ? undefined : dto.search,
        statusFilter: dto.statusFilter
          ? ORGANIZATION_MEMBER_STATUS_FILTER_TO_MEMBERSHIP_STATUS[dto.statusFilter]
          : undefined,
        include: dto.include,
        joinDateStart: dto.joinDateStart,
        joinDateEnd: dto.joinDateEnd,
      })
    )

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
    const meta = buildPaginationMeta(total, {
      page: dto.page,
      perPage: dto.limit,
    })
    const result: PaginatedResult = {
      data: mappedData,
      meta: {
        total: meta.total,
        per_page: meta.perPage,
        current_page: meta.currentPage,
        last_page: meta.lastPage,
      },
    }

    // 9. Cache result
    if (cacheKey) {
      await this.saveToCache(cacheKey, result, 180) // 3 minutes
    }

    return result
  }

  /**
   * Check if user is member of organization
   */
  private async checkMembership(userId: string, organizationId: string): Promise<void> {
    const actorMembership = await this.deps.getMembershipContext(
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
    return this.deps.getCache(key)
  }

  /**
   * Save to Redis cache
   */
  private async saveToCache(key: string, data: PaginatedResult, ttl: number): Promise<void> {
    await this.deps.setCache(key, data, ttl)
  }

  private async resolveEngineUserIds(dto: GetOrganizationMembersDTO): Promise<string[] | null> {
    if (!dto.hasSearch() || !this.deps.searchCandidateReader.isEnabled()) {
      return null
    }

    try {
      const limit = Math.max(dto.page * dto.limit, 50)
      const hits = await this.deps.searchCandidateReader.searchUserCandidates({
        q: dto.search ?? '',
        limit,
      })

      if (hits.length === 0) {
        return null
      }

      return hits.map((hit) => hit.userId)
    } catch (error) {
      searchFallbackObserver.record({ surface: 'organizations.members.list', error })
      return null
    }
  }
}
