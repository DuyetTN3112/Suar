import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import GetMyInvitationsPageQuery from '#modules/users/actions/queries/invitations/get_my_invitations_page_query'
import { buildMyInvitationsPageRequest } from '#modules/users/controllers/mappers/request/invitations/my_invitations_page_request_mapper'

@inject()
export default class MyInvitationsPageController {
  constructor(private readonly invitationsPage: GetMyInvitationsPageQuery) {}

  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const userId = execCtx.userId

    if (!userId) {
      throw new UnauthorizedException()
    }

    const pagination = buildMyInvitationsPageRequest(ctx.request)
    const page = await this.invitationsPage
      .executeAndWrap(userId, pagination)
      .then((outcome) => outcome.getValue())

    return inertia.render('profile/invitations', page)
  }
}
