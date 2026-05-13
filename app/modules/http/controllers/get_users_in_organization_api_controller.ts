import type { HttpContext } from '@adonisjs/core/http'

import { organizationPublicApi } from '#actions/organizations/public_api'
import BusinessLogicException from '#exceptions/business_logic_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { ErrorMessages } from '#modules/errors/constants/error_constants'

/**
 * GET /api/users-in-organization → Get users in current organization
 */
export default class GetUsersInOrganizationApiController {
  async handle(ctx: HttpContext) {
    const { auth, response, session } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }

    const userOrgId = auth.user.current_organization_id
    const sessionOrgId = session.get('current_organization_id') as string | undefined
    const organizationId = userOrgId ?? sessionOrgId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const formattedUsers = await organizationPublicApi.getUsersInOrganization(
      organizationId,
      auth.user.id
    )

    response.json({ success: true, users: formattedUsers })
  }
}
