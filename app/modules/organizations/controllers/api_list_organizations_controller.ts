import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import GetAllOrganizationsQuery from '#modules/organizations/actions/queries/get_all_organizations_query'

/**
 * GET /api/organizations
 * API endpoint providing organizations list
 */
export default class ApiListOrganizationsController {
  async handle(ctx: HttpContext) {
    const { request } = ctx
    const getAllOrganizations = new GetAllOrganizationsQuery()
    const q = request.input('q') as unknown
    const organizations =
      typeof q === 'string' && q.trim().length > 0
        ? await getAllOrganizations.searchBasicList(q)
        : await getAllOrganizations.getBasicList()
    return wrapApiV1Data(organizations)
  }
}
