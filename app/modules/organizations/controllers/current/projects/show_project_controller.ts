import type { HttpContext } from '@adonisjs/core/http'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { getProjectDetail } from '#modules/projects/public_contracts/project_detail'

/**
 * GET /org/projects/:id
 * Show project detail while keeping organization shell.
 */
export default class OrgShowProjectController {
  async handle(ctx: HttpContext) {
    const { params, inertia } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const result = await getProjectDetail({
      projectId: params['projectId'] as string,
      organizationId,
    }, actionContextFromHttp(ctx))

    return await inertia.render('projects/show', {
      ...result,
      shellMode: 'organization',
      baseRoute: '/org/projects',
    })
  }
}
