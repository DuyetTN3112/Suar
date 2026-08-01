import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminOrganizationActionFactory } from '#modules/admin/organizations/actions/ports/inbound/admin_organization_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'


/**
 * ShowOrganizationController
 *
 * Show organization details
 *
 * GET /admin/organizations/:id
 */
@inject()
export default class ShowOrganizationController {
  constructor(private readonly actions: AdminOrganizationActionFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, params } = ctx

    const execCtx = actionContextFromHttp(ctx)
    const query = this.actions.makeGetOrganizationDetailsQuery(execCtx)
    const organizationId = String(params['organizationId'])

    const organization = await query.handle({ organizationId })

    return inertia.render('organizations/show', { organization })
  }
}
