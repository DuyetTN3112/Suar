import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'


import { buildUpdateProfileSnapshotAccessDTO } from './mappers/request/user_request_mapper.js'
import { mapSnapshotMutationApiBody } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'

@inject()
export default class UpdateProfileSnapshotAccessController {
  constructor(private readonly profileActions: UserProfileActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, params } = ctx

    const command = this.profileActions.makeUpdateSnapshotAccess(actionContextFromHttp(ctx))
    const result = await command.handle(
      buildUpdateProfileSnapshotAccessDTO(request, params['snapshotId'] as string)
    )

    ctx.response.status(200).json(mapSnapshotMutationApiBody(result))
  }
}
