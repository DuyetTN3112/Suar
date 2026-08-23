import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserTalentQueryFactory } from '#modules/users/actions/ports/inbound/user_talent_query_factory'
import { mapProfileViewApiBody } from '#modules/users/controllers/mappers/response/profile/user_response_mapper'


@inject()
export default class TalentDetailController {
  constructor(private readonly talentQueries: UserTalentQueryFactory) {}

  async handle(ctx: HttpContext) {
    const result = await this.talentQueries
      .makeRecruitingTalentProfile(actionContextFromHttp(ctx))
      .executeAndWrap({ userId: ctx.params['userId'] as string })

    ctx.response.status(200).json(mapProfileViewApiBody(result.getValue()))
  }

}
