import type { HttpContext } from '@adonisjs/core/http'

import { mapProjectDetailPageProps } from './mappers/response/project_response_mapper.js'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import GetProjectDetailQuery from '#modules/projects/actions/queries/get_project_detail_query'

/**
 * GET /projects/:id → Show project detail
 */
export default class ShowProjectController {
  async handle(ctx: HttpContext) {
    const { params, inertia, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }
    const query = new GetProjectDetailQuery(actionContextFromHttp(ctx))
    const projectId = params.id as string
    const result = await query.handle({ projectId, organizationId })

    return await inertia.render('projects/show', mapProjectDetailPageProps(result))
  }
}
