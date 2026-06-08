import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetProjectMemberCandidatesQuery from '#modules/projects/actions/queries/get_project_member_candidates_query'

/**
 * GET /api/projects/:id/member-candidates → List org members not already in project
 */
export default class ListProjectMemberCandidatesController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const query = new GetProjectMemberCandidatesQuery(actionContextFromHttp(ctx))
    const result = await query.handle({
      project_id: params.id as string,
      search: request.input('search') as string | undefined,
    })
    response.json({ data: result })
  }
}
