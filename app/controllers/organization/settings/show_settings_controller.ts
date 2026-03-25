import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetOrganizationSettingsQuery from '#actions/organization/settings/queries/get_organization_settings_query'

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
    const execCtx = ExecutionContext.fromHttp(ctx)

    // Execute query
    const query = new GetOrganizationSettingsQuery(execCtx)
    const result = await query.handle({})

    return inertia.render('org/settings/index', result)
  }
}
