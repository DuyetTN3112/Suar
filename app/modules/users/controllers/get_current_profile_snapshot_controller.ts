import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'


import { buildGetCurrentProfileSnapshotDTO } from './mappers/request/user_request_mapper.js'
import { mapCurrentProfileSnapshotApiBody } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'

@inject()
export default class GetCurrentProfileSnapshotController {
  constructor(private readonly profileActions: UserProfileActionFactory) {}

  async handle(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const query = this.profileActions.makeCurrentSnapshot(execCtx)

    const result = await query.handle(buildGetCurrentProfileSnapshotDTO(execCtx.userId))

    ctx.response.status(200).json(mapCurrentProfileSnapshotApiBody(result.snapshot))
  }
}
