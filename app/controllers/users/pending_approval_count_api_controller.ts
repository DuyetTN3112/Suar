import type { HttpContext } from '@adonisjs/core/http'

import { mapPendingApprovalCountApiBody } from './mappers/response/user_response_mapper.js'

import GetPendingApprovalUsersQuery from '#actions/users/queries/get_pending_approval_users_query'
import { requireSystemUserAdminAccess } from '#controllers/authorization/require_system_user_admin_access'


/**
 * GET /api/users/pending-approval/count → JSON count of pending approval users
 */
export default class PendingApprovalCountApiController {
  async handle(ctx: HttpContext) {
    const { response } = ctx
    const accessContext = await requireSystemUserAdminAccess(ctx)

    const query = new GetPendingApprovalUsersQuery()
    const count = await query.getCount(accessContext.organizationId)

    response.json(mapPendingApprovalCountApiBody(count))
  }
}
