import type { HttpContext } from '@adonisjs/core/http'

import UpdateUserSettings from '#actions/settings/update_user_settings'

/**
 * POST /settings/display → Update display settings
 */
export default class UpdateDisplaySettingsController {
  handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const updateUserSettings = new UpdateUserSettings()

    const data = request.only(['layout', 'density', 'animations_enabled', 'custom_scrollbars']) as {
      layout?: string
      density?: string
      animations_enabled?: boolean
      custom_scrollbars?: boolean
    }
    updateUserSettings.handle({ data })
    session.flash('success', 'Tùy chọn hiển thị đã được cập nhật thành công')
    response.redirect().back()
  }
}
