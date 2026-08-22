import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import GetMyInvitationsPageQuery from '#modules/users/actions/queries/get_my_invitations_page_query'

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

    const page = await this.invitationsPage
      .executeAndWrap(userId, {
        page: ctx.request.input('page'),
        perPage:
          (ctx.request.input('perPage') as unknown) ??
          (ctx.request.input('per_page') as unknown) ??
          (ctx.request.input('limit') as unknown),
      })
      .then((outcome) => outcome.getValue())

    return inertia.render('profile/invitations', page)
  }
}
