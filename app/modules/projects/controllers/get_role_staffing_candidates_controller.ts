import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapRoleStaffingCandidatesApiBody } from './mappers/response/project_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'

/**
 * GET /api/projects/:projectId/roles/:roleId/candidates → Staffing candidates for a role
 */
@inject()
export default class GetRoleStaffingCandidatesController {
  constructor(private readonly queries: ProjectQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { params } = ctx
    const result = await this.queries.makeRoleStaffingCandidates(actionContextFromHttp(ctx)).handle({
      project_id: params['projectId'] as string,
      role_id: params['roleId'] as string,
    })
    return mapRoleStaffingCandidatesApiBody(result)
  }
}
