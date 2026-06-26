import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'

/** GET /api/v1/projects/:projectId/task-authoring-context */
@inject()
export default class GetProjectTaskAuthoringContextController {
  constructor(private readonly queries: ProjectQueryFactory) {}

  async handle(ctx: HttpContext) {
    const result = await this.queries
      .makeTaskAuthoringContext(actionContextFromHttp(ctx))
      .executeAndWrap({
        projectId: ctx.params['projectId'] as string,
        organizationId: requireCurrentOrganizationId(ctx),
      })
      .then((outcome) => outcome.getValue())

    return wrapApiV1Data(result)
  }
}
