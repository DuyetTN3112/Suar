import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildProjectsListDTO } from './mappers/request/project_request_mapper.js'
import { mapProjectsIndexPageProps } from './mappers/response/project_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'

/**
 * GET /projects → List projects
 */
@inject()
export default class ListProjectsController {
  constructor(private readonly queries: ProjectQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, response, session, request } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildProjectsListDTO(request, organizationId)
    const outcome = await this.queries.makeProjectsIndex(actionContextFromHttp(ctx)).handle(dto)
    if (outcome.redirectTo) {
      return response.redirect(outcome.redirectTo)
    }
    const showOrganizationRequiredModal = session.has('show_organization_required_modal')

    return await inertia.render(
      'projects/index',
      mapProjectsIndexPageProps(outcome.projects, showOrganizationRequiredModal)
    )
  }
}
