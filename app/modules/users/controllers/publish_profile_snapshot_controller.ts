import type { HttpContext } from '@adonisjs/core/http'


import { buildPublishUserProfileSnapshotDTO } from './mappers/request/user_request_mapper.js'
import { mapSnapshotMutationApiBody } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import PublishUserProfileSnapshotCommand from '#modules/users/actions/commands/publish_user_profile_snapshot_command'

export default class PublishProfileSnapshotController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx

    const command = new PublishUserProfileSnapshotCommand(actionContextFromHttp(ctx))
    const result = await command.handle(buildPublishUserProfileSnapshotDTO(request))

    response.status(201).json(mapSnapshotMutationApiBody(result))
  }
}
