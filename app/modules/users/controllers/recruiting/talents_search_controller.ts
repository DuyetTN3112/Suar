import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserTalentQueryFactory } from '#modules/users/actions/ports/inbound/user_talent_query_factory'
import { buildTalentSearchRequest } from '#modules/users/controllers/mappers/request/talent/talent_search_request_mapper'
import { mapTalentSearchApiBody } from '#modules/users/controllers/mappers/response/profile/user_response_mapper'

@inject()
export default class TalentsSearchController {
  constructor(private readonly talentQueries: UserTalentQueryFactory) {}

  async handle(ctx: HttpContext) {
    const input = buildTalentSearchRequest(ctx.request)
    const query = this.talentQueries.makeRecruitingSearch(actionContextFromHttp(ctx))
    const result = await query
      .executeAndWrap(input)
      .then((outcome) => outcome.getValue())

    return mapTalentSearchApiBody(result)
  }
}
