import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { SettingsActionFactory } from '#modules/settings/actions/ports/inbound/settings_action_factory'
import { buildWebSettingsUpdate } from '#modules/settings/controllers/mappers/request/settings_request_mapper'

/**
 * PUT /settings → Update general settings
 */
@inject()
export default class UpdateSettingsController {
  constructor(private readonly actions: SettingsActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const updateUserSettings = this.actions.makeUpdateUserSettingsCommand()

    await updateUserSettings.handle({
      userId: user.id,
      data: buildWebSettingsUpdate(request),
    })
    session.flash('success', 'Cài đặt đã được cập nhật thành công')
    response.redirect().back()
  }
}
