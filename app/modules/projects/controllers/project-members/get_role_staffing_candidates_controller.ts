import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapRoleStaffingCandidatesApiBody } from '../mappers/response/project-context/project_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'
import { buildRoleStaffingCandidatesRequest } from '#modules/projects/controllers/mappers/request/project-members/role_staffing_candidates_request_mapper'

/**
 * GET /api/projects/:projectId/roles/:roleId/candidates → Staffing candidates for a role
 */
@inject()
export default class GetRoleStaffingCandidatesController {
  constructor(private readonly queries: ProjectQueryFactory) {}

  async handle(ctx: HttpContext) {
    const input = buildRoleStaffingCandidatesRequest(ctx.params)
    const result = await this.queries
      .makeRoleStaffingCandidates(actionContextFromHttp(ctx))
      .executeAndWrap(input)
      .then((outcome) => outcome.getValue())
    return mapRoleStaffingCandidatesApiBody(result)
  }
}
