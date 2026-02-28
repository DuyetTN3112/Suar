import type { HttpContext } from '@adonisjs/core/http'
import UpdateUserSettings from '#actions/settings/update_user_settings'

/**
 * POST /settings/appearance → Update appearance settings
 */
export default class UpdateAppearanceSettingsController {
  handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const updateUserSettings = new UpdateUserSettings(ctx)

    try {
      const data = request.only(['theme', 'font']) as { theme?: string; font?: string }

      if (data.theme && !['light', 'dark', 'system'].includes(data.theme)) {
        data.theme = 'light'
      }

      updateUserSettings.handle({
        data: {
          theme: data.theme as 'light' | 'dark' | 'system' | undefined,
          font: data.font,
        },
      })
      session.flash('success', 'Giao diện đã được cập nhật thành công')
      response.redirect().back()
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật giao diện'
      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }
}
