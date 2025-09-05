import type { HttpContext } from '@adonisjs/core/http'


import { buildGetPublicProfileSnapshotDTO } from './mappers/request/user_request_mapper.js'
import { mapPublicProfileSnapshotApiBody } from './mappers/response/user_response_mapper.js'

import { optionalActionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetPublicProfileSnapshotQuery from '#modules/users/actions/queries/get_public_profile_snapshot_query'

export default class GetPublicProfileSnapshotController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx

    const query = new GetPublicProfileSnapshotQuery(optionalActionContextFromHttp(ctx))
    const result = await query.handle(
      buildGetPublicProfileSnapshotDTO(request, params.slug as string)
    )

    response.status(200).json(mapPublicProfileSnapshotApiBody(result.snapshot))
  }
}
