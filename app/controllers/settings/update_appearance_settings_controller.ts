import type { HttpContext } from '@adonisjs/core/http'
import UpdateUserSettings from '#actions/settings/update_user_settings'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * POST /settings/appearance → Update appearance settings
 */
export default class UpdateAppearanceSettingsController {
  handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const updateUserSettings = new UpdateUserSettings(ctx)

    const data = request.only(['theme', 'font']) as { theme?: string; font?: string }

    if (data.theme && !['light', 'dark', 'system'].includes(data.theme)) {
      throw new BusinessLogicException('Invalid theme value')
    }

    updateUserSettings.handle({
      data: {
        theme: data.theme as 'light' | 'dark' | 'system' | undefined,
        font: data.font,
      },
    })
    session.flash('success', 'Giao diện đã được cập nhật thành công')
    response.redirect().back()
  }
}
