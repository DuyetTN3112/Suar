import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildSystemUsersListDTO } from './mappers/request/user_request_mapper.js'
import { mapSystemUsersApiBody } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserAdministrationQueryFactory } from '#modules/users/actions/ports/inbound/user_administration_query_factory'

/**
 * GET /api/system-users → Get system users (not in current organization)
 * Permission: Superadmin only
 */
@inject()
export default class SystemUsersApiController {
  constructor(private readonly administrationQueries: UserAdministrationQueryFactory) {}

  async handle(ctx: HttpContext) {
    const context = actionContextFromHttp(ctx)
    const { request } = ctx

    const dto = buildSystemUsersListDTO(request, context.organizationId ?? '')

    const users = await this.administrationQueries
      .makeAuthorizedUsersList(context)
      .handle(dto)

    return mapSystemUsersApiBody(users)
  }
}
