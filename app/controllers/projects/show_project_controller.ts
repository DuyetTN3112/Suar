import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetProjectDetailQuery from '#actions/projects/queries/get_project_detail_query'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import { mapProjectDetailPageProps } from './mapper/response/project_response_mapper.js'

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
    const query = new GetProjectDetailQuery(ExecutionContext.fromHttp(ctx))
    const projectId = params.id as string
    const result = await query.handle({ projectId, organizationId })

    return await inertia.render('projects/show', mapProjectDetailPageProps(result))
  }
}
