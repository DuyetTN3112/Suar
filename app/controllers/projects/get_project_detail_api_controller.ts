import type { HttpContext } from '@adonisjs/core/http'
import GetProjectDetailQuery from '#actions/projects/queries/get_project_detail_query'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import { ExecutionContext } from '#types/execution_context'
import { mapProjectDetailApiBody } from './mapper/response/project_response_mapper.js'

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

    const query = new GetProjectDetailQuery(ExecutionContext.fromHttp(ctx))
    const projectId = params.id as string
    const result = await query.handle({ projectId, organizationId })
    response.json(mapProjectDetailApiBody(result))
  }
}
