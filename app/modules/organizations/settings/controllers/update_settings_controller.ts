import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationSettingsActionFactory } from '#modules/organizations/settings/actions/ports/inbound/organization_settings_action_factory'

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
    const { request, response, session } = ctx
    const execCtx = actionContextFromHttp(ctx)

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined
    }

    // Parse request body
    const name = toOptionalString(request.input('name') as unknown)
    const description = toOptionalString(request.input('description') as unknown)
    const website = toOptionalString(request.input('website') as unknown)
    const email = toOptionalString(request.input('email') as unknown)

    // Execute command
    const command = this.actions.makeUpdateSettings(execCtx)
    await command.handle(omitUndefined({
      name,
      description,
      website,
      email,
    }))

    session.flash('success', 'Organization settings updated successfully')

    response.redirect().toRoute('org.settings.show')
  }
}
