import type { HttpContext } from '@adonisjs/core/http'

import GetAllOrganizationsQuery from '#actions/organizations/queries/get_all_organizations_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'

/**
 * GET /all-organizations
 * Display all organizations in the system
 */
export default class AllOrganizationsController {
  async handle({ inertia, auth }: HttpContext) {
    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const user = auth.user

    const getAllOrganizations = new GetAllOrganizationsQuery()
    const enhancedOrganizations = await getAllOrganizations.getWithMembershipStatus(user.id)

    return inertia.render('organizations/all', {
      organizations: enhancedOrganizations,
      currentOrganizationId: user.current_organization_id,
    })
  }
}
