import type { HttpContext } from '@adonisjs/core/http'


import { buildRotateProfileSnapshotShareLinkDTO } from './mappers/request/user_request_mapper.js'
import { mapSnapshotMutationApiBody } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import RotateProfileSnapshotShareLinkCommand from '#modules/users/actions/commands/rotate_profile_snapshot_share_link_command'

export default class RotateProfileSnapshotShareLinkController {
  async handle(ctx: HttpContext) {
    const command = new RotateProfileSnapshotShareLinkCommand(actionContextFromHttp(ctx))
    const result = await command.handle(
      buildRotateProfileSnapshotShareLinkDTO(ctx.params.id as string)
    )

    ctx.response.status(200).json(mapSnapshotMutationApiBody(result))
  }
}
