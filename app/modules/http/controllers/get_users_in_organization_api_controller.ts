import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'

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
