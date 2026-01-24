import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'


import { buildUpdateAccountSettingsDTO } from './mappers/request/settings_request_mapper.js'
import { getAccountSettingsUpdatedMessage } from './mappers/response/settings_response_mapper.js'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SettingsActionFactory } from '#modules/settings/actions/ports/inbound/settings_action_factory'

/**
 * POST /settings/account → Update account settings
 */
@inject()
export default class UpdateAccountSettingsController {
  constructor(private readonly actions: SettingsActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, auth, session } = ctx

    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const dto = buildUpdateAccountSettingsDTO(request, user.id, user.email)
    const command = this.actions.makeUpdateAccountSettingsCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', getAccountSettingsUpdatedMessage())
    response.redirect().back()
  }
}
