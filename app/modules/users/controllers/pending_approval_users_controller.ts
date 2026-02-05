import type { HttpContext } from '@adonisjs/core/http'

import { buildPendingApprovalUsersListDTO } from './mappers/request/user_request_mapper.js'
import { mapPendingApprovalUsersPageProps } from './mappers/response/user_response_mapper.js'

import GetUserMetadata from '#actions/users/get_user_metadata'
import GetUsersListQuery from '#actions/users/queries/get_users_list_query'
import { resolveSystemUserAdminAccess } from '#modules/authorization/controllers/require_system_user_admin_access'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /users/pending-approval → Inertia page for pending approval users
 */
export default class PendingApprovalUsersController {
  async handle(ctx: HttpContext) {
    const getUsersListQuery = new GetUsersListQuery(ExecutionContext.fromHttp(ctx))
    const getUserMetadata = new GetUserMetadata()
    const { request, inertia } = ctx

    const accessContext = await resolveSystemUserAdminAccess(ctx)
    if (!accessContext) {
      inertia.location('/users')
      return
    }

    const dto = buildPendingApprovalUsersListDTO(request, accessContext.organizationId)

    const users = await getUsersListQuery.handle(dto)
    const metadata = getUserMetadata.handle()

    return inertia.render(
      'users/pending_approval',
      mapPendingApprovalUsersPageProps(users, metadata, {
        page: dto.pagination.page,
        limit: dto.pagination.limit,
        search: dto.filters.search,
      })
    )
  }
}
