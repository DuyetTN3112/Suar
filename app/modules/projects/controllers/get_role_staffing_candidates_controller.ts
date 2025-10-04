import type { HttpContext } from '@adonisjs/core/http'

import { mapRoleStaffingCandidatesApiBody } from './mappers/response/project_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import GetRoleStaffingCandidatesQuery from '#modules/projects/actions/queries/get_role_staffing_candidates_query'

/**
 * GET /api/projects/:projectId/roles/:roleId/candidates → Staffing candidates for a role
 */
export default class GetRoleStaffingCandidatesController {
  async handle(ctx: HttpContext) {
    const { params } = ctx
    const query = new GetRoleStaffingCandidatesQuery(actionContextFromHttp(ctx))
    const result = await query.handle({
      project_id: params['projectId'] as string,
      role_id: params['roleId'] as string,
    })
    return mapRoleStaffingCandidatesApiBody(result)
  }
}
