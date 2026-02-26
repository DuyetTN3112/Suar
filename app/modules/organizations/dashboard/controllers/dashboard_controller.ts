import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  actionContextFromHttp,
  resolveCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { OrganizationDashboardQueryFactory } from '#modules/organizations/dashboard/actions/ports/inbound/organization_dashboard_query_factory'

/**
 * OrgDashboardController
 *
 * Show organization dashboard
 *
 * GET /org
 */
@inject()
export default class OrgDashboardController {
  constructor(private readonly actions: OrganizationDashboardQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, auth } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const { user } = auth

    if (!user) {
      return inertia.render('org/no_org', {})
    }

    const organizationId = resolveCurrentOrganizationId(ctx)
    if (!organizationId) {
      return inertia.render('org/no_org', {})
    }

    const query = this.actions.makeDashboardStats(execCtx)
    const stats = await query.handle({
      organizationId,
    })

    return inertia.render('org/dashboard', {
      stats,
    })
  }
}
