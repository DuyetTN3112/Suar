import type { HttpContext } from '@adonisjs/core/http'

import { mapProjectDetailApiBody } from './mappers/response/project_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import GetProjectDetailQuery from '#modules/projects/actions/queries/get_project_detail_query'

/**
 * GET /api/projects/:projectId → Fetch project detail as JSON (for modal)
 */
export default class GetProjectDetailApiController {
  async handle(ctx: HttpContext) {
    const { params } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const query = new GetProjectDetailQuery(actionContextFromHttp(ctx))
    const projectId = params['projectId'] as string
    const result = await query.handle({ projectId, organizationId })
    return mapProjectDetailApiBody(result)
  }
}
