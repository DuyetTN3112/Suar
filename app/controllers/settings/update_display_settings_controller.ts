import type { HttpContext } from '@adonisjs/core/http'
import UpdateUserSettings from '#actions/settings/update_user_settings'

/**
 * POST /settings/display → Update display settings
 */
export default class UpdateDisplaySettingsController {
  handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const updateUserSettings = new UpdateUserSettings(ctx)

    try {
      const data = request.only([
        'layout',
        'density',
        'animations_enabled',
        'custom_scrollbars',
      ]) as {
        layout?: string
        density?: string
        animations_enabled?: boolean
        custom_scrollbars?: boolean
      }
      updateUserSettings.handle({ data })
      session.flash('success', 'Tùy chọn hiển thị đã được cập nhật thành công')
      response.redirect().back()
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật tùy chọn hiển thị'
      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }
}
