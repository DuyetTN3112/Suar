import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { mapApiV1SettingsResponse, wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { SettingsActionFactory } from '#modules/settings/actions/ports/inbound/settings_action_factory'
import { buildApiSettingsUpdate } from '#modules/settings/controllers/mappers/request/settings_request_mapper'

@inject()
export default class UpdateSettingsController {
  constructor(private readonly actions: SettingsActionFactory) {}

  async handle(ctx: HttpContext) {
    const user = ctx.auth.user

    if (!user) {
      throw new UnauthorizedException()
    }

    const result = await this.actions.makeUpdateUserSettingsCommand().handle({
      userId: user.id,
      data: buildApiSettingsUpdate(ctx.request),
    })

    return wrapApiV1Data(mapApiV1SettingsResponse(result.data))
  }
}
