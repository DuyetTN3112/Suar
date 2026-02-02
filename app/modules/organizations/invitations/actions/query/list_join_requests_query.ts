import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { OrganizationActionContext } from '#modules/organizations/invitations/actions/action_context'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/invitations/actions/dtos/common/organization_pagination'
import type { OrganizationMembershipRepository } from '#modules/organizations/invitations/actions/ports/outbound/organization_persistence'
import { BaseQuery } from '#modules/organizations/invitations/actions/query/base_query'
import {
  buildPaginationMeta,
  normalizePagination,
  slicePageItems,
} from '#modules/pagination/public_contracts/pagination_public_api'
export interface ListJoinRequestsDTO {
  page?: number
  perPage?: number
  search?: string
}

export interface ListJoinRequestsResult {
  requests: {
    user_id: string
    username: string
    email: string | null
    org_role: string
    status: string
    created_at: string
  }[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
  filters: {
    search?: string
  }
}

export default class ListJoinRequestsQuery extends BaseQuery<
  ListJoinRequestsDTO,
  ListJoinRequestsResult
> {
  constructor(
    execCtx: OrganizationActionContext,
    private readonly memberships: OrganizationMembershipRepository
  ) {
    super(execCtx)
  }

  async handle(dto: ListJoinRequestsDTO): Promise<ListJoinRequestsResult> {
    const organizationId = this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const pagination = normalizePagination(dto, ORGANIZATION_PAGINATION, { perPage: 50 })
    const search = dto.search?.trim().toLowerCase()

    const pendingMemberships =
      await this.memberships.findPendingMembershipsWithUserInfo(organizationId)

    const filtered = pendingMemberships.filter((membership) => {
      if (membership.invited_by) {
        return false
      }

      if (!search) {
        return true
      }

      const username = membership.user.username.toLowerCase()
      const email = membership.user.email?.toLowerCase() ?? ''
      return username.includes(search) || email.includes(search)
    })

    const total = filtered.length
    const paginated = slicePageItems(filtered, pagination)
    const meta = buildPaginationMeta(total, pagination)

    return {
      requests: paginated.map((membership) => ({
        user_id: membership.user_id,
        username: membership.user.username,
        email: membership.user.email,
        org_role: membership.org_role,
        status: membership.status,
        created_at: membership.created_at.toISOString(),
      })),
      meta: {
        total: meta.total,
        perPage: meta.perPage,
        currentPage: meta.currentPage,
        lastPage: meta.lastPage,
      },
      filters: omitUndefined({
        search: dto.search,
      }),
    }
  }
}
