import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UpdateUserSettings from '#modules/settings/actions/update_user_settings'

/**
 * PUT /settings → Update general settings
 */
export default class UpdateSettingsController {
  handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const updateUserSettings = new UpdateUserSettings()

    const data = request.only(['theme', 'notifications_enabled', 'display_mode']) as {
      theme?: string
      notifications_enabled?: boolean
      display_mode?: string
    }

    if (data.theme && !['light', 'dark', 'system'].includes(data.theme)) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
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
