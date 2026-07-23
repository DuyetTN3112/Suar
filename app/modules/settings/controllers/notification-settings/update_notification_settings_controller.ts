import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { SettingsActionFactory } from '#modules/settings/actions/ports/inbound/settings_action_factory'
import { buildNotificationSettingsUpdate } from '#modules/settings/controllers/mappers/request/settings/settings_request_mapper'


/**
 * POST /settings/notifications → Update notification settings
 */

 export default class UpdateNotificationSettingsController {
  constructor(private readonly actions: SettingsActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const updateUserSettings = this.actions.makeUpdateUserSettingsCommand()

    await updateUserSettings
      .executeAndWrap({
        userId: user.id,
        data: buildNotificationSettingsUpdate(request),
      })
      .then((outcome) => outcome.getValue())
    session.flash('success', 'Cài đặt thông báo đã được cập nhật thành công')
    response.redirect().back()
  }

}
