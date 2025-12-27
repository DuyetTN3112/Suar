import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { mapApiV1SettingsResponse } from '#modules/http/api_v1/response_mappers'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateUserSettings from '#modules/settings/actions/update_user_settings'
import type { UserSettingUpdate } from '#modules/settings/types/user_setting'

function readInput(request: HttpContext['request'], camelKey: string, snakeKey: string) {
  const value: unknown = request.input(camelKey, request.input(snakeKey))
  return value
}

export default class UpdateSettingsController {
  async handle(ctx: HttpContext) {
    const user = ctx.auth.user

    if (!user) {
      throw new UnauthorizedException()
    }

    const data: UserSettingUpdate = {
      theme: readInput(ctx.request, 'theme', 'theme') as UserSettingUpdate['theme'],
      notifications_enabled: readInput(
        ctx.request,
        'notificationsEnabled',
        'notifications_enabled'
      ) as UserSettingUpdate['notifications_enabled'],
      display_mode: readInput(
        ctx.request,
        'displayMode',
        'display_mode'
      ) as UserSettingUpdate['display_mode'],
      font: readInput(ctx.request, 'font', 'font') as UserSettingUpdate['font'],
      layout: readInput(ctx.request, 'layout', 'layout') as UserSettingUpdate['layout'],
      density: readInput(ctx.request, 'density', 'density') as UserSettingUpdate['density'],
      animations_enabled: readInput(
        ctx.request,
        'animationsEnabled',
        'animations_enabled'
      ) as UserSettingUpdate['animations_enabled'],
      custom_scrollbars: readInput(
        ctx.request,
        'customScrollbars',
        'custom_scrollbars'
      ) as UserSettingUpdate['custom_scrollbars'],
    }

    if (data.theme && !['light', 'dark', 'system'].includes(data.theme)) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    if (data.display_mode && !['grid', 'list'].includes(data.display_mode)) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    const result = await new UpdateUserSettings().handle({
      userId: user.id,
      data,
    })

    return mapApiV1SettingsResponse(result.data)
  }
}
