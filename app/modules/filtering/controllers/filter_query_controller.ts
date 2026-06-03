import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { FilteringActionFactory } from '#modules/filtering/actions/ports/inbound/filtering_action_factory'
import { filteringPrincipalFromHttp } from '#modules/filtering/controllers/filtering_http_principal'
import { buildFilterCriteriaRequest } from '#modules/filtering/controllers/mappers/request/filtering/filter_request_mapper'
import { toFilterHttpException } from '#modules/http/boundary/filter_http_problem'


@inject()
export default class FilterQueryController {
  constructor(private readonly actions: FilteringActionFactory) {}

  async handle(ctx: HttpContext) {
    try {
      const criteria = buildFilterCriteriaRequest(ctx.request.body())
      const requestId = ctx.requestContext.requestId
      const result = await this.actions.executeFilterQuery.executeAndWrap({
        criteria,
        principal: filteringPrincipalFromHttp(ctx),
        requestId,
      })
      return result.getValue()
    } catch (error) {
      const translated = toFilterHttpException(error)
      if (translated !== undefined) throw translated
      throw error
    }
  }

}
