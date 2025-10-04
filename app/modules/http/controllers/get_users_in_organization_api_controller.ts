import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { requireCurrentOrganizationId } from '#modules/http/public_contracts/http_execution_context'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'

/**
 * GET /api/users-in-organization → Get users in current organization
 */
export default class GetUsersInOrganizationApiController {
  async handle(ctx: HttpContext) {
    const { auth } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }

    const organizationId = requireCurrentOrganizationId(ctx)

    const formattedUsers = await organizationPublicApi.getUsersInOrganization(
      organizationId,
      auth.user.id
    )

    return wrapApiV1Data(formattedUsers)
  }
}
