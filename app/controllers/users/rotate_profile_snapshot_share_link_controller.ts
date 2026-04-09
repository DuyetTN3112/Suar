import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import RotateProfileSnapshotShareLinkCommand from '#actions/users/commands/rotate_profile_snapshot_share_link_command'
import { buildRotateProfileSnapshotShareLinkDTO } from './mapper/request/user_request_mapper.js'
import { mapSnapshotMutationApiBody } from './mapper/response/user_response_mapper.js'

export default class RotateProfileSnapshotShareLinkController {
  async handle(ctx: HttpContext) {
    const command = new RotateProfileSnapshotShareLinkCommand(ExecutionContext.fromHttp(ctx))
    const result = await command.handle(
      buildRotateProfileSnapshotShareLinkDTO(ctx.params.id as string)
    )

    ctx.response.status(200).json(mapSnapshotMutationApiBody(result))
  }
}
