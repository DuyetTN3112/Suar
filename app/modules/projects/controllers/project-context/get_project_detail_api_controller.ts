import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapProjectDetailApiBody } from '../mappers/response/project-context/project_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'

/**
 * GET /api/projects/:projectId → Fetch project detail as JSON (for modal)
 */
@inject()
export default class GetProjectDetailApiController {
  constructor(private readonly queries: ProjectQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { params } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const projectId = params['projectId'] as string
    const result = await this.queries
      .makeDetail(actionContextFromHttp(ctx))
      .executeAndWrap({ projectId, organizationId })
      .then((outcome) => outcome.getValue())
    return mapProjectDetailApiBody(result)
  }
}
