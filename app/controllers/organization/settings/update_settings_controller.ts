import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateOrganizationSettingsCommand from '#actions/organization/settings/commands/update_organization_settings_command'

/**
 * UpdateSettingsController
 *
 * Update org settings
 *
 * PUT /org/settings
 */
export default class UpdateSettingsController {
  async handle({ request, response, session }: HttpContext) {
    const execCtx = ExecutionContext.fromHttp({ request } as any)

    // Parse request body
    const name = request.input('name')
    const description = request.input('description')
    const website = request.input('website')
    const email = request.input('email')

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
