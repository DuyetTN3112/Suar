import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapPendingApprovalCountApiBody } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserAdministrationQueryFactory } from '#modules/users/actions/ports/inbound/user_administration_query_factory'

/**
 * GET /api/users/pending-approval/count → JSON count of pending approval users
 */
@inject()
export default class PendingApprovalCountApiController {
  constructor(private readonly administrationQueries: UserAdministrationQueryFactory) {}

  async handle(ctx: HttpContext) {
    const count = await this.administrationQueries
      .makePendingApprovals(actionContextFromHttp(ctx))
      .getCount()

    return mapPendingApprovalCountApiBody(count)
  }
}
