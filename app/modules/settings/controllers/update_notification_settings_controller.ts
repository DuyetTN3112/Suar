import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { SettingsActionFactory } from '#modules/settings/actions/ports/inbound/settings_action_factory'

/**
 * POST /settings/notifications → Update notification settings
 */
@inject()
export default class UpdateNotificationSettingsController {
  constructor(private readonly actions: SettingsActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const updateUserSettings = this.actions.makeUpdateUserSettingsCommand()

    const emailNotifications = request.input('emailNotifications', false) as boolean

    await updateUserSettings.handle({
      userId: user.id,
      data: {
        notifications_enabled: emailNotifications,
      },
    })
    session.flash('success', 'Cài đặt thông báo đã được cập nhật thành công')
    response.redirect().back()
  }
}
