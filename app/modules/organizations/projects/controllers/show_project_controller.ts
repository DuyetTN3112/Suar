import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { OrganizationProjectDetailQueryFactory } from '#modules/organizations/projects/actions/ports/inbound/organization_project_detail_query_factory'

/**
 * GET /org/projects/:id
 * Show project detail while keeping organization shell.
 */
@inject()
export default class OrgShowProjectController {
  constructor(private readonly actions: OrganizationProjectDetailQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)
    const projectId = params['projectId'] as string

    await this.actions
      .make(actionContextFromHttp(ctx))
      .execute({
        projectId,
        organizationId,
      })

    const requestedFocus: unknown = request.input('focus')
    const focus =
      typeof requestedFocus === 'string' && requestedFocus.length > 0
        ? `?focus=${encodeURIComponent(requestedFocus)}`
        : ''

    return response.redirect(`/projects/${encodeURIComponent(projectId)}${focus}`)
  }
}
