import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapPendingApprovalUsersApiBody } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserAdministrationQueryFactory } from '#modules/users/actions/ports/inbound/user_administration_query_factory'

/**
 * GET /api/users/pending-approval → JSON list of pending approval users
 */
@inject()
export default class PendingApprovalUsersApiController {
  constructor(private readonly administrationQueries: UserAdministrationQueryFactory) {}

  async handle(ctx: HttpContext) {
    const formattedUsers = await this.administrationQueries
      .makePendingApprovals(actionContextFromHttp(ctx))
      .getList()

    return mapPendingApprovalUsersApiBody(formattedUsers)
  }
}
