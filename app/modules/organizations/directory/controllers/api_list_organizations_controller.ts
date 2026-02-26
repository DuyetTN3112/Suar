import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { OrganizationDirectoryQueryFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_directory_query_factory'

/**
 * GET /api/organizations
 * API endpoint providing organizations list
 */
@inject()
export default class ApiListOrganizationsController {
  constructor(private readonly actions: OrganizationDirectoryQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { request } = ctx
    const getAllOrganizations = this.actions.makeAllOrganizationsQuery()
    const q = request.input('q') as unknown
    const organizations =
      typeof q === 'string' && q.trim().length > 0
        ? await getAllOrganizations.searchBasicList(q)
        : await getAllOrganizations.getBasicList()
    return wrapApiV1Data(organizations)
  }
}
