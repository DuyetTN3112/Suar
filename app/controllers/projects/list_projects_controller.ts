import type { HttpContext } from '@adonisjs/core/http'

import { buildProjectsListDTO } from './mappers/request/project_request_mapper.js'
import { mapProjectsIndexPageProps } from './mappers/response/project_response_mapper.js'

import GetProjectsListQuery from '#actions/projects/queries/get_projects_list_query'
import { ErrorMessages } from '#constants/error_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /projects → List projects
 */
export default class ListProjectsController {
  async handle(ctx: HttpContext) {
    const { inertia, session, request } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = buildProjectsListDTO(request, organizationId)
    const query = new GetProjectsListQuery(ExecutionContext.fromHttp(ctx))
    const result = await query.handle(dto)
    const showOrganizationRequiredModal = session.has('show_organization_required_modal')

    return await inertia.render(
      'projects/index',
      mapProjectsIndexPageProps(result, showOrganizationRequiredModal)
    )
  }
}
