import type { HttpContext } from '@adonisjs/core/http'
import UpdateUserSettings from '#actions/settings/update_user_settings'

/**
 * POST /settings/notifications → Update notification settings
 */
export default class UpdateNotificationSettingsController {
  handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const updateUserSettings = new UpdateUserSettings(ctx)

    try {
      const emailNotifications = request.input('emailNotifications', false) as boolean

      updateUserSettings.handle({
        data: {
          notifications_enabled: emailNotifications,
        },
      })
      session.flash('success', 'Cài đặt thông báo đã được cập nhật thành công')
      response.redirect().back()
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật cài đặt thông báo'
      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }
}
