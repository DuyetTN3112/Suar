import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetPublicProfileSnapshotQuery from '#actions/users/queries/get_public_profile_snapshot_query'
import { buildGetPublicProfileSnapshotDTO } from './mapper/request/user_request_mapper.js'
import { mapPublicProfileSnapshotApiBody } from './mapper/response/user_response_mapper.js'

export default class GetPublicProfileSnapshotController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx

    const query = new GetPublicProfileSnapshotQuery(ExecutionContext.fromHttpOptional(ctx))
    const result = await query.handle(
      buildGetPublicProfileSnapshotDTO(request, params.slug as string)
    )

    response.status(200).json(mapPublicProfileSnapshotApiBody(result.snapshot))
  }
}
