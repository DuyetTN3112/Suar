import type { HttpContext } from '@adonisjs/core/http'

import { buildGetPublicProfileSnapshotDTO } from './mappers/request/user_request_mapper.js'
import { mapPublicProfileSnapshotApiBody } from './mappers/response/user_response_mapper.js'

import GetPublicProfileSnapshotQuery from '#actions/users/queries/get_public_profile_snapshot_query'
import { ExecutionContext } from '#types/execution_context'

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
