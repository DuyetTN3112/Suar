import type { AdminActionContext } from '#modules/admin/users/actions/action_context'
import type { AdminUserDirectory } from '#modules/admin/users/actions/ports/outbound/admin_user_administration'
import { BaseQuery } from '#modules/admin/users/actions/query/base_query'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'

/**
 * GetUserDetailsQuery (System Admin)
 *
 * Query to get detailed information about a specific user.
 */

export interface GetUserDetailsDTO {
  userId: string
}

export interface UserDetailsResult {
  id: string
  username: string
  email: string | null
  system_role: string
  status: string
  current_organization_id: string | null
  is_external_contributor: boolean
  created_at: string
  updated_at: string
}

export default class GetUserDetailsQuery extends BaseQuery<GetUserDetailsDTO, UserDetailsResult> {
  constructor(
    execCtx: AdminActionContext,
    private readonly userDirectory: AdminUserDirectory
  ) {
    super(execCtx)
  }

  async handle(dto: GetUserDetailsDTO): Promise<UserDetailsResult> {
    const user = await this.userDirectory.findById(dto.userId)

    if (!user) {
      throw NotFoundException.user(dto.userId)
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      system_role: user.systemRole,
      status: user.status,
      current_organization_id: user.currentOrganizationId,
      is_external_contributor: user.isExternalContributor,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    }
  }
}
