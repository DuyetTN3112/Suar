import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetPublicProfileSnapshotQuery, {
  GetPublicProfileSnapshotDTO,
} from '#actions/users/queries/get_public_profile_snapshot_query'

export default class GetPublicProfileSnapshotController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx

    const query = new GetPublicProfileSnapshotQuery(ExecutionContext.fromHttpOptional(ctx))
    const result = await query.handle(
      new GetPublicProfileSnapshotDTO(
        params.slug as string,
        request.input('token') as string | undefined
      )
    )

    const serialized = result.snapshot.serialize()
    const publicSnapshot = {
      ...serialized,
      shareable_token: undefined,
    }

    response.status(200).json({ success: true, data: publicSnapshot })
  }
}
