import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetCurrentProfileSnapshotQuery, {
  GetCurrentProfileSnapshotDTO,
} from '#actions/users/queries/get_current_profile_snapshot_query'

export default class GetCurrentProfileSnapshotController {
  async handle(ctx: HttpContext) {
    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new GetCurrentProfileSnapshotQuery(execCtx)

    const result = await query.handle(new GetCurrentProfileSnapshotDTO(execCtx.userId as string))

    ctx.response.status(200).json({ success: true, data: result.snapshot })
  }
}
