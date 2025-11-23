import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetUserSettings from '#modules/settings/actions/get_user_settings'

/**
 * GET /settings → Show settings page
 */
export default class ShowSettingsController {
  async handle(ctx: HttpContext) {
    const { inertia, auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const getUserSettings = new GetUserSettings()
    const settings = await getUserSettings.handle(user.id)
    return inertia.render('settings/index', { settings })
  }
}
