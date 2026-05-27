import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetRoleStaffingCandidatesQuery from '#modules/projects/actions/queries/get_role_staffing_candidates_query'

/**
 * GET /api/projects/:projectId/roles/:roleId/candidates → Staffing candidates for a role
 */
export default class GetRoleStaffingCandidatesController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const query = new GetRoleStaffingCandidatesQuery(actionContextFromHttp(ctx))
    const result = await query.handle({
      project_id: params.projectId as string,
      role_id: params.roleId as string,
    })
    response.json(result)
  }
}
