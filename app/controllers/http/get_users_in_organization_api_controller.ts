import type { HttpContext } from '@adonisjs/core/http'
import GetUsersInOrganizationQuery from '#actions/organizations/queries/get_users_in_organization_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

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
      throw new BusinessLogicException('Vui lòng chọn organization')
    }

    const query = new GetUsersInOrganizationQuery()
    const formattedUsers = await query.execute(organizationId, auth.user.id)

    response.json({ success: true, users: formattedUsers })
  }
}
