import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'


import { buildUpdateProfileSettingsDTO } from '../mappers/request/settings/settings_request_mapper.js'
import { getProfileSettingsUpdatedMessage } from '../mappers/response/settings/settings_response_mapper.js'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SettingsActionFactory } from '#modules/settings/actions/ports/inbound/settings_action_factory'

/**
 * POST /settings/profile → Update profile settings
 */
@inject()
export default class UpdateProfileSettingsController {
  constructor(private readonly actions: SettingsActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, auth, session } = ctx

    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const dto = buildUpdateProfileSettingsDTO(request, user.id)
    const command = this.actions.makeUpdateProfileSettingsCommand(actionContextFromHttp(ctx))
    await command.executeAndWrap(dto).then((outcome) => outcome.getValue())

    session.flash('success', getProfileSettingsUpdatedMessage())
    response.redirect().back()
  }
}
