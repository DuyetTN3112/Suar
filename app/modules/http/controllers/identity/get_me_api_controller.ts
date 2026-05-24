import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import GetMeQuery from '#modules/http/actions/queries/get_me_query'
import { mapApiV1MeResponse, wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { resolveCurrentOrganizationId } from '#modules/http/boundary/http_execution_context'

/**
 * GET /api/me → Get current authenticated user
 */
@inject()
export default class GetMeApiController {
  constructor(private readonly getMeQuery: GetMeQuery) {}

  async handle(ctx: HttpContext) {
    if (!ctx.auth.user) {
      await ctx.auth.check()
    }

    const user = ctx.auth.user
    if (!user) {
      return wrapApiV1Data(null)
    }

    const result = await this.getMeQuery.executeAndWrap({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatar_url,
        systemRole: user.system_role,
      },
      currentOrganizationId: resolveCurrentOrganizationId(ctx),
    }).then((outcome) => outcome.getValue())

    return wrapApiV1Data(mapApiV1MeResponse(result))
  }
}
