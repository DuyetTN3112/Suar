import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'

/**
 * ListOrganizationMembersQuery (Organization Admin)
 *
 * Query to list all members of the current organization.
 * Only accessible by org_owner and org_admin.
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
  data: Array<{
    user_id: string
    username: string
    email: string | null
    org_role: string
    status: string
    invited_by: string | null
    created_at: string
  }>
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
  constructor(execCtx: ExecutionContext) {
    super(execCtx)
  }

  async handle(dto: ListOrganizationMembersDTO): Promise<ListOrganizationMembersResult> {
    const page = dto.page || 1
    const perPage = dto.perPage || 50

    // Build query
    let query = db
      .from('organization_users')
      .innerJoin('users', 'organization_users.user_id', 'users.id')
      .where('organization_users.organization_id', dto.organizationId)
      .select(
        'users.id as user_id',
        'users.username',
        'users.email',
        'organization_users.org_role',
        'organization_users.status',
        'organization_users.invited_by',
        'organization_users.created_at'
      )

    // Search filter
    if (dto.search) {
      query = query.where((q) => {
        q.where('users.username', 'ilike', `%${dto.search}%`).orWhere(
          'users.email',
          'ilike',
          `%${dto.search}%`
        )
      })
    }

    // Org role filter
    if (dto.orgRole) {
      query = query.where('organization_users.org_role', dto.orgRole)
    }

    // Status filter
    if (dto.status) {
      query = query.where('organization_users.status', dto.status)
    }

    // Order by created_at DESC
    query = query.orderBy('organization_users.created_at', 'desc')

    // Count total
    const countQuery = query.clone().clearSelect().clearOrder().count('* as total')
    const countResult = await countQuery.first()
    const total = Number(countResult?.total || 0)

    // Paginate
    const offset = (page - 1) * perPage
    const data = await query.limit(perPage).offset(offset)

    const lastPage = Math.ceil(total / perPage)

    return {
      data: data.map((row: any) => ({
        user_id: row.user_id,
        username: row.username,
        email: row.email,
        org_role: row.org_role,
        status: row.status,
        invited_by: row.invited_by,
        created_at: new Date(row.created_at).toISOString(),
      })),
      meta: {
        total,
        perPage,
        currentPage: page,
        lastPage,
      },
    }
  }
}
