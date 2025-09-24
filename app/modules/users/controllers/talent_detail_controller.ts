import type { HttpContext } from '@adonisjs/core/http'

import { mapProfileViewApiBody } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetProfileViewPageQuery from '#modules/users/actions/queries/get_profile_view_page_query'

export default class TalentDetailController {
  async handle(ctx: HttpContext) {
    const result = await new GetProfileViewPageQuery(actionContextFromHttp(ctx)).execute({
      userId: ctx.params.userId as string,
      currentUserId: ctx.auth.user?.id ?? null,
    })

    ctx.response.status(200).json(mapProfileViewApiBody(result))
  }
}
