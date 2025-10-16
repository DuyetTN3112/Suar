import type { AdminActionContext } from '#modules/admin/actions/admin_action_context'
import { BaseQuery } from '#modules/admin/actions/base_query'
import type { AdminUserSearchCandidateReader } from '#modules/admin/actions/ports/admin_search_candidate_readers'
import { ADMIN_PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import { EngineAdminUserSearchCandidateReader } from '#modules/admin/infra/adapters/engine_admin_search_candidate_readers'
import { AdminUserReadOps } from '#modules/admin/infra/repositories/read/admin_user_queries'
import {
  buildPaginationMeta,
  normalizePagination,
  toWindowLimit,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'

/**
 * ListUsersQuery (System Admin)
 *
 * Query to list all users in the system with filtering and pagination.
 * Uses repository (Infrastructure layer) for DB queries.
 */

export interface ListUsersDTO {
  page?: number
  perPage?: number
  search?: string
  systemRole?: string
  status?: string
}

export interface ListUsersResult {
  data: {
    id: string
    username: string
    email: string | null
    system_role: string
    status: string
    current_organization_id: string | null
    is_external_contributor: boolean
    created_at: string
  }[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export default class ListUsersQuery extends BaseQuery<ListUsersDTO, ListUsersResult> {
  constructor(
    execCtx: AdminActionContext,
    private userRepo = AdminUserReadOps,
    private readonly userSearchCandidateReader: AdminUserSearchCandidateReader = new EngineAdminUserSearchCandidateReader()
  ) {
    super(execCtx)
  }

  async handle(dto: ListUsersDTO): Promise<ListUsersResult> {
    const pagination = normalizePagination(dto, ADMIN_PAGINATION, { perPage: 50 })
    const userIds = await this.resolveEngineUserIds(
      dto.search,
      pagination.page,
      pagination.perPage
    )

    const baseFilters = {
      ...(userIds || !dto.search ? {} : { search: dto.search }),
      ...(dto.systemRole ? { systemRole: dto.systemRole } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(userIds ? { userIds } : {}),
    }

    // Prefer engine-ranked candidates when available, but fall back to direct DB
    // search if the index is stale and yields no live rows.
    let result = await this.userRepo.listUsers(
      {
        ...baseFilters,
      },
      pagination.page,
      pagination.perPage
    )

    if (userIds && result.users.length === 0 && dto.search?.trim()) {
      result = await this.userRepo.listUsers(
        {
          search: dto.search,
          ...(dto.systemRole ? { systemRole: dto.systemRole } : {}),
          ...(dto.status ? { status: dto.status } : {}),
        },
        pagination.page,
        pagination.perPage
      )
    }

    const meta = buildPaginationMeta(result.total, pagination)

    return {
      data: result.users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        system_role: user.system_role,
        status: user.status,
        current_organization_id: user.current_organization_id,
        is_external_contributor: user.is_external_contributor,
        created_at: user.created_at.toISO() ?? new Date().toISOString(),
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
    if (!search?.trim() || !isSearchRuntimeEnabled()) {
      return null
    }

    try {
      const hits = await this.userSearchCandidateReader.searchUserCandidates({
        q: search,
        limit: toWindowLimit(page, perPage),
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
