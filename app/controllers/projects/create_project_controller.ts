import type { HttpContext } from '@adonisjs/core/http'
import GetUserOwnedOrganizationsQuery from '#actions/organizations/queries/get_user_owned_organizations_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'

/**
 * GET /projects/create → Show create project form
 */
export default class CreateProjectController {
  async handle({ inertia, auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }

    const organizations = await GetUserOwnedOrganizationsQuery.execute(user.id)
    const statuses: { id: string; name: string }[] = []

    return inertia.render('projects/create', { organizations, statuses })
  }
}
