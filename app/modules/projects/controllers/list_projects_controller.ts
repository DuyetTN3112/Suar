import type { HttpContext } from '@adonisjs/core/http'

import { buildProjectsListDTO } from './mappers/request/project_request_mapper.js'
import { mapProjectsIndexPageProps } from './mappers/response/project_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import GetProjectsListQuery from '#modules/projects/actions/queries/get_projects_list_query'

/**
 * GET /projects → List projects
 */
export default class ListProjectsController {
  async handle(ctx: HttpContext) {
    const { auth, inertia, response, session, request } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    if (auth.user) {
      const membershipContext = await organizationPublicApi.getMembershipContext(
        organizationId,
        auth.user.id,
        undefined,
        true
      )

      if (organizationPublicApi.canAccessAdminShell(membershipContext?.role ?? null).allowed) {
        return response.redirect('/org/projects')
      }
    }

    const dto = buildProjectsListDTO(request, organizationId)
    const query = new GetProjectsListQuery(actionContextFromHttp(ctx))
    const result = await query.handle(dto)
    const showOrganizationRequiredModal = session.has('show_organization_required_modal')

    return await inertia.render(
      'projects/index',
      mapProjectsIndexPageProps(result, showOrganizationRequiredModal)
    )
  }
}
