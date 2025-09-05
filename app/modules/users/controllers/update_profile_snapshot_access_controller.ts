import type { HttpContext } from '@adonisjs/core/http'


import { buildUpdateProfileSnapshotAccessDTO } from './mappers/request/user_request_mapper.js'
import { mapSnapshotMutationApiBody } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpdateProfileSnapshotAccessCommand from '#modules/users/actions/commands/update_profile_snapshot_access_command'

export default class UpdateProfileSnapshotAccessController {
  async handle(ctx: HttpContext) {
    const { request, params } = ctx

    const command = new UpdateProfileSnapshotAccessCommand(actionContextFromHttp(ctx))
    const result = await command.handle(
      buildUpdateProfileSnapshotAccessDTO(request, params.id as string)
    )

    ctx.response.status(200).json(mapSnapshotMutationApiBody(result))
  }
}
