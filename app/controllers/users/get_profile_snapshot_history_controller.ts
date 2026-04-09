import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetProfileSnapshotHistoryQuery from '#actions/users/queries/get_profile_snapshot_history_query'
import { buildGetProfileSnapshotHistoryDTO } from './mapper/request/user_request_mapper.js'
import { mapProfileSnapshotHistoryApiBody } from './mapper/response/user_response_mapper.js'

export default class GetProfileSnapshotHistoryController {
  async handle(ctx: HttpContext) {
    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new GetProfileSnapshotHistoryQuery(execCtx)
    const result = await query.handle(
      buildGetProfileSnapshotHistoryDTO(ctx.request, execCtx.userId as string)
    )

    ctx.response.status(200).json(mapProfileSnapshotHistoryApiBody(result.snapshots))
  }
}
