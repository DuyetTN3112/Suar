import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { BaseQuery } from '#modules/organizations/actions/base_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import type { OrganizationMemberSearchCandidateReader } from '#modules/organizations/actions/ports/organization_member_search_candidate_reader'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/application/dtos/common/organization_pagination'
import { EngineOrganizationMemberSearchCandidateReader } from '#modules/organizations/infra/adapters/engine_organization_member_search_candidate_reader'
import OrganizationMemberRepository from '#modules/organizations/infra/current/repositories/organization_member_repository'
import {
  buildPaginationMeta,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'

/**
 * ListOrganizationMembersQuery (Organization Admin)
 *
 * Query to list all members of the current organization.
 * Uses repository (Infrastructure layer) for DB queries.
 */

export interface ListOrganizationMembersDTO {
  organizationId: string
  page?: number
  perPage?: number
  search?: string
  orgRole?: string
  status?: string
}

export interface ListOrganizationMembersResult {
  data: {
    user_id: string
    username: string
    email: string | null
    org_role: string
    status: string
    invited_by: string | null
    created_at: string
  }[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export default class ListOrganizationMembersQuery extends BaseQuery<
  ListOrganizationMembersDTO,
  ListOrganizationMembersResult
> {
  constructor(
    execCtx: OrganizationActionContext,
    private memberRepo = new OrganizationMemberRepository(),
    private readonly searchCandidateReader: OrganizationMemberSearchCandidateReader = new EngineOrganizationMemberSearchCandidateReader()
  ) {
    super(execCtx)
  }

  async handle(dto: ListOrganizationMembersDTO): Promise<ListOrganizationMembersResult> {
    const pagination = normalizePagination(dto, ORGANIZATION_PAGINATION, { perPage: 50 })
    const userIds = await this.resolveEngineUserIds(
      dto.search,
      pagination.page,
      pagination.perPage
    )

    // Fetch from repository (Infrastructure layer)
    const result = await this.memberRepo.listMembers(
      dto.organizationId,
      omitUndefined({
        search: userIds ? undefined : dto.search,
        orgRole: dto.orgRole,
        status: dto.status,
        userIds: userIds ?? undefined,
      }),
      pagination.page,
      pagination.perPage
    )
    const meta = buildPaginationMeta(result.total, pagination)

    return {
      data: result.members.map((member) => ({
        user_id: member.user_id,
        username: member.username,
        email: member.email,
        org_role: member.org_role,
        status: member.status,
        invited_by: member.invited_by,
        created_at: member.created_at.toISOString(),
      })),
      meta: {
        total: meta.total,
        perPage: meta.perPage,
        currentPage: meta.currentPage,
        lastPage: meta.lastPage,
      },
    }
  }

  private async resolveEngineUserIds(
    search: string | undefined,
    page: number,
    perPage: number
  ): Promise<string[] | null> {
    if (!search || !isSearchRuntimeEnabled()) {
      return null
    }

    try {
      const limit = Math.max(page * perPage, 50)
      const hits = await this.searchCandidateReader.searchUserCandidates({
        q: search,
        limit,
      })

      if (hits.length === 0) {
        return null
      }

      return hits.map((hit) => hit.userId)
    } catch {
      return null
    }
  }
}
