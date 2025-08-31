import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpdateOrganizationSettingsCommand from '#modules/organizations/actions/current/settings/commands/update_organization_settings_command'

/**
 * UpdateSettingsController
 *
 * Update org settings
 *
 * PUT /org/settings
 */
export default class UpdateSettingsController {
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
    const command = new UpdateOrganizationSettingsCommand(execCtx)
    await command.handle({
      name,
      description,
      website,
      email,
    })

    session.flash('success', 'Organization settings updated successfully')

    response.redirect().toRoute('org.settings.show')
  }
}
