import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildPublishUserProfileSnapshotDTO } from '../mappers/request/profile/user_request_mapper.js'
import { mapSnapshotMutationApiBody } from '../mappers/response/profile/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'

@inject()
export default class PublishProfileSnapshotController {
  constructor(private readonly profileActions: UserProfileActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response } = ctx

    const command = this.profileActions.makePublishSnapshot(actionContextFromHttp(ctx))
    const result = await command
      .executeAndWrap(buildPublishUserProfileSnapshotDTO(request))
      .then((outcome) => outcome.getValue())

    response.status(201).json(mapSnapshotMutationApiBody(result))
  }
}
