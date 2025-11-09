import type { HttpContext } from '@adonisjs/core/http'

import { mapProjectDetailApiBody } from './mappers/response/project_response_mapper.js'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import GetProjectDetailQuery from '#modules/projects/actions/queries/get_project_detail_query'

/**
 * GET /api/projects/:id → Fetch project detail as JSON (for modal)
 */
export default class GetProjectDetailApiController {
  async handle(ctx: HttpContext) {
    const { params, response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const query = new GetProjectDetailQuery(actionContextFromHttp(ctx))
    const projectId = params.id as string
    const result = await query.handle({ projectId, organizationId })
    response.json(mapProjectDetailApiBody(result))
  }
}
