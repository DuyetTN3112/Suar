import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UpdateProfileDiscoverabilityDTO } from '#modules/users/actions/dtos/request/update_profile_discoverability_dto'
import { UserAccountActionFactory } from '#modules/users/actions/ports/inbound/user_account_action_factory'

@inject()
export default class UpdateProfileDiscoverabilityController {
  constructor(private readonly actions: UserAccountActionFactory) {}

  async handle(ctx: HttpContext) {
    const value = ctx.request.input('is_searchable') as unknown
    const dto = new UpdateProfileDiscoverabilityDTO(value)
    const user = await this.actions
      .makeUpdateDiscoverability(actionContextFromHttp(ctx))
      .executeAndWrap(dto)
      .then((outcome) => outcome.getValue())

    if (ctx.request.accepts(['html', 'json']) === 'json') {
      return {
        data: {
          is_searchable: user.profile_settings?.is_searchable ?? false,
        },
      }
    }

    ctx.session.flash('success', 'Profile discoverability updated')
    return ctx.response.redirect().back()
  }
}
