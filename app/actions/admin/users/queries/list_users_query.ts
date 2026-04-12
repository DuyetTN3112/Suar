import { BaseQuery } from '#actions/shared/base_query'
import AdminUserRepository from '#infra/admin/repositories/admin_user_repository'
import type { ExecutionContext } from '#types/execution_context'

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
    is_freelancer: boolean
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
    execCtx: ExecutionContext,
    private userRepo = new AdminUserRepository()
  ) {
    super(execCtx)
  }

  async handle(dto: ListUsersDTO): Promise<ListUsersResult> {
    const page = dto.page ?? 1
    const perPage = dto.perPage ?? 50

    // Fetch from repository (Infrastructure layer)
    const result = await this.userRepo.listUsers(
      {
        search: dto.search,
        systemRole: dto.systemRole,
        status: dto.status,
      },
      page,
      perPage
    )

    const lastPage = Math.ceil(result.total / perPage)

    return {
      data: result.users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        system_role: user.system_role,
        status: user.status,
        current_organization_id: user.current_organization_id,
        is_freelancer: user.is_freelancer,
        created_at: user.created_at.toISO() ?? new Date().toISOString(),
      })),
      meta: {
        total: result.total,
        perPage,
        currentPage: page,
        lastPage,
      },
    }
  }
}
