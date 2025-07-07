import type { HttpContext } from '@adonisjs/core/http'

import { buildPublishUserProfileSnapshotDTO } from './mappers/request/user_request_mapper.js'
import { mapSnapshotMutationApiBody } from './mappers/response/user_response_mapper.js'

import PublishUserProfileSnapshotCommand from '#actions/users/commands/publish_user_profile_snapshot_command'
import { ExecutionContext } from '#types/execution_context'

export default class PublishProfileSnapshotController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx

    const command = new PublishUserProfileSnapshotCommand(ExecutionContext.fromHttp(ctx))
    const result = await command.handle(buildPublishUserProfileSnapshotDTO(request))

    response.status(201).json(mapSnapshotMutationApiBody(result))
  }
}
