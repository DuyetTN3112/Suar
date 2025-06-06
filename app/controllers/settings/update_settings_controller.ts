import type { HttpContext } from '@adonisjs/core/http'
import UpdateUserSettings from '#actions/settings/update_user_settings'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * PUT /settings → Update general settings
 */
export default class UpdateSettingsController {
  handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const updateUserSettings = new UpdateUserSettings(ctx)

    const data = request.only(['theme', 'notifications_enabled', 'display_mode']) as {
      theme?: string
      notifications_enabled?: boolean
      display_mode?: string
    }

    if (data.theme && !['light', 'dark', 'system'].includes(data.theme)) {
      throw new BusinessLogicException('Invalid theme value')
    }

    updateUserSettings.handle({
      data: {
        theme: data.theme as 'light' | 'dark' | 'system' | undefined,
        notifications_enabled: data.notifications_enabled,
        display_mode: data.display_mode as 'grid' | 'list' | undefined,
      },
    })
    session.flash('success', 'Cài đặt đã được cập nhật thành công')
    response.redirect().back()
  }
}
