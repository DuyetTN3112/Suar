import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { OrganizationDirectoryQueryFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_directory_query_factory'
import { buildApiListOrganizationsRequest } from '#modules/organizations/controllers/mappers/request/directory/organization_directory_read_request_mapper'

/**
 * GET /api/organizations
 * API endpoint providing organizations list
 */
@inject()
export default class ApiListOrganizationsController {
  constructor(private readonly actions: OrganizationDirectoryQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { request } = ctx
    const { q } = buildApiListOrganizationsRequest(request)
    const getAllOrganizations = this.actions.makeAllOrganizationsQuery()
    const organizations =
      typeof q === 'string' && q.trim().length > 0
        ? await getAllOrganizations.searchBasicListAndWrap(q).then((outcome) => outcome.getValue())
        : await getAllOrganizations.getBasicListAndWrap().then((outcome) => outcome.getValue())
    return wrapApiV1Data(organizations)
  }
}
