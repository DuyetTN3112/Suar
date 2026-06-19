import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationSettingsActionFactory } from '#modules/organizations/actions/ports/inbound/settings/organization_settings_action_factory'

/**
 * ShowSettingsController
 *
 * Show org settings
 *
 * GET /org/settings
 */
@inject()
export default class ShowSettingsController {
  constructor(private readonly actions: OrganizationSettingsActionFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const execCtx = actionContextFromHttp(ctx)

    // Execute query
    const query = this.actions.makeGetSettings(execCtx)
    const result = await query.executeAndWrap({}).then((outcome) => outcome.getValue())

    return inertia.render('settings/index', result)
  }
}
