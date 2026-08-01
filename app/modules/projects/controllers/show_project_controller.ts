import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapProjectDetailPageProps } from './mappers/response/project_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'

/**
 * GET /projects/:id → Show project detail
 */
@inject()
export default class ShowProjectController {
  constructor(private readonly queries: ProjectQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { params, inertia, session } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const projectId = params['projectId'] as string
    const result = await this.queries
      .makeDetail(actionContextFromHttp(ctx))
      .handle({ projectId, organizationId })

    session.put('current_project_id', projectId)
    await session.commit()

    return await inertia.render('projects/show', {
      ...mapProjectDetailPageProps(result),
      workspaceMode: 'project',
      baseRoute: '/projects',
    })
  }
}
