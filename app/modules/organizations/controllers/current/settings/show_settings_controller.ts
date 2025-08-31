import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetOrganizationSettingsQuery from '#modules/organizations/actions/current/settings/queries/get_organization_settings_query'

/**
 * ShowSettingsController
 *
 * Show org settings
 *
 * GET /org/settings
 */
export default class ShowSettingsController {
  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const execCtx = actionContextFromHttp(ctx)

    // Execute query
    const query = new GetOrganizationSettingsQuery(execCtx)
    const result = await query.handle({})

    return inertia.render('org/settings/index', result)
  }
}
