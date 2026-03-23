import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import User from '#models/user'

/**
 * ListUsersQuery (System Admin)
 *
 * Query to list all users in the system with filtering and pagination.
 * Only accessible by system admins.
 */

export interface ListUsersDTO {
  page?: number
  perPage?: number
  search?: string
  systemRole?: string
  status?: string
}

export interface ListUsersResult {
  data: Array<{
    id: string
    username: string
    email: string | null
    system_role: string
    status: string
    current_organization_id: string | null
    is_freelancer: boolean
    created_at: string
  }>
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export default class ListUsersQuery extends BaseQuery<ListUsersDTO, ListUsersResult> {
  constructor(execCtx: ExecutionContext) {
    super(execCtx)
  }

  async handle(dto: ListUsersDTO): Promise<ListUsersResult> {
    const page = dto.page || 1
    const perPage = dto.perPage || 50

    // Build query
    const query = User.query()

    // Search filter
    if (dto.search) {
      query.where((q) => {
        q.where('username', 'ilike', `%${dto.search}%`).orWhere(
          'email',
          'ilike',
          `%${dto.search}%`
        )
      })
    }

    // System role filter
    if (dto.systemRole) {
      query.where('system_role', dto.systemRole)
    }

    // Status filter
    if (dto.status) {
      query.where('status', dto.status)
    }

    // Order by created_at DESC
    query.orderBy('created_at', 'desc')

    // Execute with pagination
    const result = await query.paginate(page, perPage)

    return {
      data: result.all().map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        system_role: user.system_role,
        status: user.status,
        current_organization_id: user.current_organization_id,
        is_freelancer: user.is_freelancer,
        created_at: user.created_at?.toISO() || new Date().toISOString(),
      })),
      meta: {
        total: result.total,
        perPage: result.perPage,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
      },
    }
  }
}
