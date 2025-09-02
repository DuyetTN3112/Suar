import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateUserSettings from '#modules/settings/actions/update_user_settings'

/**
 * POST /settings/display → Update display settings
 */
export default class UpdateDisplaySettingsController {
  async handle(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const updateUserSettings = new UpdateUserSettings()

    const data = request.only(['layout', 'density', 'animations_enabled', 'custom_scrollbars']) as {
      layout?: string
      density?: string
      animations_enabled?: boolean
      custom_scrollbars?: boolean
    }
    await updateUserSettings.handle({ userId: user.id, data })
    session.flash('success', 'Tùy chọn hiển thị đã được cập nhật thành công')
    response.redirect().back()
  }
}
