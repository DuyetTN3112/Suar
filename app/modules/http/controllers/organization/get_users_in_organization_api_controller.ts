import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import GetUsersInOrganizationQuery from '#modules/http/actions/queries/get_users_in_organization_query'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { requireCurrentOrganizationId } from '#modules/http/boundary/http_execution_context'

/**
 * GET /api/users-in-organization → Get users in current organization
 */
@inject()
export default class GetUsersInOrganizationApiController {
  constructor(private readonly getUsersInOrganizationQuery: GetUsersInOrganizationQuery) {}

  async handle(ctx: HttpContext) {
    const { auth } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }

    const organizationId = requireCurrentOrganizationId(ctx)

    const formattedUsers = await this.getUsersInOrganizationQuery
      .executeAndWrap(organizationId, auth.user.id)
      .then((outcome) => outcome.getValue())

    return wrapApiV1Data(formattedUsers)
  }
}
