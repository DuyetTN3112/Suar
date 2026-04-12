import type { HttpContext } from '@adonisjs/core/http'

import GetUserSettings from '#actions/settings/get_user_settings'

/**
 * GET /settings → Show settings page
 */
export default class ShowSettingsController {
  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const getUserSettings = new GetUserSettings()
    const settings = getUserSettings.handle()
    return inertia.render('settings/index', { settings })
  }
}
