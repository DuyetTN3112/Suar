import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'


import { buildGetPublicProfileSnapshotDTO } from '../mappers/request/profile/user_request_mapper.js'
import { mapPublicProfileSnapshotPageProps } from '../mappers/response/profile/user_response_mapper.js'

import { optionalActionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'

@inject()
export default class GetPublicProfileSnapshotController {
  constructor(private readonly profileActions: UserProfileActionFactory) {}

  async handle(ctx: HttpContext) {
    const { params, request } = ctx

    const query = this.profileActions.makePublicSnapshot(optionalActionContextFromHttp(ctx))
    const result = await query
      .executeAndWrap(buildGetPublicProfileSnapshotDTO(request, params['slug'] as string))
      .then((outcome) => outcome.getValue())

    return ctx.inertia.render(
      'profile/public_snapshot',
      mapPublicProfileSnapshotPageProps(result.snapshot)
    )
  }
}
