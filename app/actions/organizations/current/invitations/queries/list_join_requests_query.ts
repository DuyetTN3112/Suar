import { BaseQuery } from '#actions/shared/base_query'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'

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
  async handle(dto: ListJoinRequestsDTO): Promise<ListJoinRequestsResult> {
    const organizationId = this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('Organization context required')
    }

    const page = dto.page ?? 1
    const perPage = dto.perPage ?? 50
    const search = dto.search?.trim().toLowerCase()

    const pendingMemberships =
      await OrganizationUserRepository.findPendingMembershipsWithUserInfo(organizationId)

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
    const offset = (page - 1) * perPage
    const paginated = filtered.slice(offset, offset + perPage)

    return {
      requests: paginated.map((membership) => ({
        user_id: membership.user_id,
        username: membership.user.username,
        email: membership.user.email,
        org_role: membership.org_role,
        status: membership.status,
        created_at: membership.created_at.toISO() ?? new Date().toISOString(),
      })),
      meta: {
        total,
        perPage,
        currentPage: page,
        lastPage: Math.max(1, Math.ceil(total / perPage)),
      },
      filters: {
        search: dto.search,
      },
    }
  }
}
