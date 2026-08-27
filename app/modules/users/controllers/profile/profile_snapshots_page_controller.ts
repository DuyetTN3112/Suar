import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildGetCurrentProfileSnapshotDTO } from '../mappers/request/profile/user_request_mapper.js'
import { mapProfileSnapshotsPageProps } from '../mappers/response/profile/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'

@inject()
export default class ProfileSnapshotsPageController {
  constructor(private readonly profileActions: UserProfileActionFactory) {}

  async handle(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const query = this.profileActions.makeCurrentSnapshot(execCtx)
    const result = await query
      .executeAndWrap(buildGetCurrentProfileSnapshotDTO(execCtx.userId))
      .then((outcome) => outcome.getValue())

    return ctx.inertia.render('profile/snapshots', mapProfileSnapshotsPageProps({
      currentSnapshot: result.snapshot,
    }))
  }
}
