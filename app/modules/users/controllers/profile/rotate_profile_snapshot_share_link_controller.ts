import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'


import { buildRotateProfileSnapshotShareLinkDTO } from '../mappers/request/profile/user_request_mapper.js'
import { mapSnapshotMutationApiBody } from '../mappers/response/profile/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'

@inject()
export default class RotateProfileSnapshotShareLinkController {
  constructor(private readonly profileActions: UserProfileActionFactory) {}

  async handle(ctx: HttpContext) {
    const command = this.profileActions.makeRotateSnapshotShareLink(actionContextFromHttp(ctx))
    const result = await command
      .executeAndWrap(buildRotateProfileSnapshotShareLinkDTO(ctx.params['snapshotId'] as string))
      .then((outcome) => outcome.getValue())

    ctx.response.status(200).json(mapSnapshotMutationApiBody(result))
  }
}
