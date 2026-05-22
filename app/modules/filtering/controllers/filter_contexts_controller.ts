import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { FilteringActionFactory } from '#modules/filtering/actions/ports/inbound/filtering_action_factory'
import { filteringPrincipalFromHttp } from '#modules/filtering/controllers/filtering_http_principal'
import { buildFilterContextRequest } from '#modules/filtering/controllers/mappers/request/filtering/filter_context_request_mapper'
import { toFilterHttpException } from '#modules/http/boundary/filter_http_problem'


@inject()
export default class FilterContextsController {
  constructor(private readonly actions: FilteringActionFactory) {}

  async handle(ctx: HttpContext) {
    try {
      const { context } = buildFilterContextRequest(ctx.params)
      const definition = await this.actions.filterContextProvider.getEffectiveDefinition({
        context,
        principal: filteringPrincipalFromHttp(ctx),
      })
      return { definition }
    } catch (error) {
      const translated = toFilterHttpException(error)
      if (translated !== undefined) throw translated
      throw error
    }
  }

}
