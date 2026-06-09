import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { OrganizationProjectDetailQueryFactory } from '#modules/organizations/actions/ports/inbound/projects/organization_project_detail_query_factory'
import { buildProjectRedirectRequest } from '#modules/organizations/controllers/mappers/request/projects/project_redirect_request_mapper'

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
    const input = buildProjectRedirectRequest(params, request)

    await this.actions
      .make(actionContextFromHttp(ctx))
      .executeAndWrap({ projectId: input.projectId, organizationId })
      .then((outcome) => outcome.getValue())

    const focus =
      input.focus
        ? `?focus=${encodeURIComponent(input.focus)}`
        : ''

    return response.redirect(`/projects/${encodeURIComponent(input.projectId)}${focus}`)
  }
}
