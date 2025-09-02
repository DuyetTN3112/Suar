import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateUserSettings from '#modules/settings/actions/update_user_settings'

/**
 * POST /settings/notifications → Update notification settings
 */
export default class UpdateNotificationSettingsController {
  async handle(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const updateUserSettings = new UpdateUserSettings()

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
