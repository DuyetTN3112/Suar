import type { HttpContext } from '@adonisjs/core/http'


import { buildUpdateProfileSettingsDTO } from './mappers/request/settings_request_mapper.js'
import { getProfileSettingsUpdatedMessage } from './mappers/response/settings_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateProfileSettingsCommand from '#modules/settings/actions/commands/update_profile_settings_command'

/**
 * POST /settings/profile → Update profile settings
 */
export default class UpdateProfileSettingsController {
  async handle(ctx: HttpContext) {
    const { request, response, auth, session } = ctx

    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const dto = buildUpdateProfileSettingsDTO(request, user.id)
    const command = new UpdateProfileSettingsCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', getProfileSettingsUpdatedMessage())
    response.redirect().back()
  }
}
