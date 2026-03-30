import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { SettingsActionFactory } from '#modules/settings/actions/ports/inbound/settings_action_factory'

/**
 * GET /settings → Show settings page
 */
@inject()
export default class ShowSettingsController {
  constructor(private readonly actions: SettingsActionFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const getUserSettings = this.actions.makeGetUserSettingsQuery()
    const settings = await getUserSettings.handle(user.id)
    return inertia.render('settings/index', { settings })
  }
}
