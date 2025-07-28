import { BaseQuery } from '#actions/admin/base_query'
import { AdminUserReadOps } from '#infra/admin/repositories/read/admin_user_queries'
import type { ExecutionContext } from '#types/execution_context'

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
  is_freelancer: boolean
  created_at: string
  updated_at: string
}

export default class GetUserDetailsQuery extends BaseQuery<GetUserDetailsDTO, UserDetailsResult> {
  constructor(
    execCtx: ExecutionContext,
    private userRepo = AdminUserReadOps
  ) {
    super(execCtx)
  }

  async handle(dto: GetUserDetailsDTO): Promise<UserDetailsResult> {
    const user = await this.userRepo.findById(dto.userId)

    if (!user) {
      throw new Error(`User not found: ${dto.userId}`)
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      system_role: user.system_role,
      status: user.status,
      current_organization_id: user.current_organization_id,
      is_freelancer: user.is_freelancer,
      created_at: user.created_at.toISO() ?? new Date().toISOString(),
      updated_at: user.updated_at.toISO() ?? new Date().toISOString(),
    }
  }
}
