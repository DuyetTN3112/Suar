import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationSettingsActionFactory } from '#modules/organizations/actions/ports/inbound/settings/organization_settings_action_factory'
import { buildUpdateOrganizationSettingsInput } from '#modules/organizations/controllers/mappers/request/settings/update_organization_settings_request_mapper'

/**
 * UpdateSettingsController
 *
 * Update org settings
 *
 * PUT /org/settings
 */
@inject()
export default class UpdateSettingsController {
  constructor(private readonly actions: OrganizationSettingsActionFactory) {}

  async handle(ctx: HttpContext) {
    const { response, session } = ctx
    const execCtx = actionContextFromHttp(ctx)

    const command = this.actions.makeUpdateSettings(execCtx)
    await command
      .executeAndWrap(buildUpdateOrganizationSettingsInput(ctx.request.body()))
      .then((outcome) => outcome.getValue())

    session.flash('success', 'Organization settings updated successfully')

    response.redirect().toRoute('org.settings.show')
  }
}
