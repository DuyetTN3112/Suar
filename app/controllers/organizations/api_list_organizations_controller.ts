import type { HttpContext } from '@adonisjs/core/http'
import GetAllOrganizationsQuery from '#actions/organizations/queries/get_all_organizations_query'

/**
 * GET /api/organizations
 * API endpoint providing organizations list
 */
export default class ApiListOrganizationsController {
  async handle(ctx: HttpContext) {
    const { response } = ctx
    const getAllOrganizations = new GetAllOrganizationsQuery()
    const organizations = await getAllOrganizations.getBasicList()
    response.json(organizations)
  }
}
