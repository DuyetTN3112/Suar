import type { HttpContext } from '@adonisjs/core/http'

import { buildGetCurrentProfileSnapshotDTO } from './mappers/request/user_request_mapper.js'
import { mapCurrentProfileSnapshotApiBody } from './mappers/response/user_response_mapper.js'

import GetCurrentProfileSnapshotQuery from '#actions/users/queries/get_current_profile_snapshot_query'
import { ExecutionContext } from '#types/execution_context'

export default class GetCurrentProfileSnapshotController {
  async handle(ctx: HttpContext) {
    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new GetCurrentProfileSnapshotQuery(execCtx)

    const result = await query.handle(buildGetCurrentProfileSnapshotDTO(execCtx.userId))

    ctx.response.status(200).json(mapCurrentProfileSnapshotApiBody(result.snapshot))
  }
}
