import type { HttpContext } from '@adonisjs/core/http'

import { mapPendingApprovalCountApiBody } from './mappers/response/user_response_mapper.js'
import { requireSystemUserAdminAccess } from './support/system_user_admin_access.js'

import GetPendingApprovalUsersQuery from '#modules/users/actions/queries/get_pending_approval_users_query'

/**
 * GET /api/users/pending-approval/count → JSON count of pending approval users
 */
export default class PendingApprovalCountApiController {
  async handle(ctx: HttpContext) {
    const accessContext = await requireSystemUserAdminAccess(ctx)

    const query = new GetPendingApprovalUsersQuery()
    const count = await query.getCount(accessContext.organizationId)

    return mapPendingApprovalCountApiBody(count)
  }
}
