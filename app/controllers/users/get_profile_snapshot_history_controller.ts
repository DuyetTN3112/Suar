import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetProfileSnapshotHistoryQuery, {
  GetProfileSnapshotHistoryDTO,
} from '#actions/users/queries/get_profile_snapshot_history_query'

export default class GetProfileSnapshotHistoryController {
  async handle(ctx: HttpContext) {
    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new GetProfileSnapshotHistoryQuery(execCtx)
    const limit = Number(ctx.request.input('limit') ?? 20)

    const result = await query.handle(
      new GetProfileSnapshotHistoryDTO(execCtx.userId as string, limit)
    )

    ctx.response.status(200).json({ success: true, data: result.snapshots })
  }
}
