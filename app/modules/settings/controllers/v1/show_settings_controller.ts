import type { HttpContext } from '@adonisjs/core/http'

import { mapApiV1SettingsResponse } from '#modules/http/api_v1/response_mappers'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetUserSettings from '#modules/settings/actions/get_user_settings'

export default class ShowSettingsController {
  async handle(ctx: HttpContext) {
    const user = ctx.auth.user

    if (!user) {
      throw new UnauthorizedException()
    }

    const settings = await new GetUserSettings().handle(user.id)
    return mapApiV1SettingsResponse(settings)
  }
}
