import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateUserSettings from '#modules/settings/actions/update_user_settings'
import {
  SETTING_DISPLAY_MODE_OPTIONS,
  SETTING_THEME_OPTIONS,
  type SettingDisplayMode,
  type SettingTheme,
} from '#modules/settings/constants/user_setting_constants'

/**
 * PUT /settings → Update general settings
 */
export default class UpdateSettingsController {
  async handle(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const updateUserSettings = new UpdateUserSettings()

    const data = request.only(['theme', 'notifications_enabled', 'display_mode']) as {
      theme?: string
      notifications_enabled?: boolean
      display_mode?: string
    }

    if (data.theme && !SETTING_THEME_OPTIONS.includes(data.theme as SettingTheme)) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    if (
      data.display_mode &&
      !SETTING_DISPLAY_MODE_OPTIONS.includes(data.display_mode as SettingDisplayMode)
    ) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    await updateUserSettings.handle({
      userId: user.id,
      data: omitUndefined({
        theme: data.theme as SettingTheme | undefined,
        notifications_enabled: data.notifications_enabled,
        display_mode: data.display_mode as SettingDisplayMode | undefined,
      }),
    })
    session.flash('success', 'Cài đặt đã được cập nhật thành công')
    response.redirect().back()
  }
}
