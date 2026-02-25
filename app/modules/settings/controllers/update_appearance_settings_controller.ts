import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UpdateUserSettings from '#modules/settings/actions/update_user_settings'

/**
 * POST /settings/appearance → Update appearance settings
 */
export default class UpdateAppearanceSettingsController {
  handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const updateUserSettings = new UpdateUserSettings()

    const data = request.only(['theme', 'font']) as { theme?: string; font?: string }

    if (data.theme && !['light', 'dark', 'system'].includes(data.theme)) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
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
