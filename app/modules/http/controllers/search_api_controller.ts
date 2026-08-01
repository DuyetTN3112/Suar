import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import GetGlobalSearchQuery from '#modules/http/actions/queries/get_global_search_query'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

@inject()
export default class SearchApiController {
  constructor(private readonly getGlobalSearch: GetGlobalSearchQuery) {}

  async handle(ctx: HttpContext) {
    const q = ctx.request.input('q') as unknown
    const query = typeof q === 'string' ? q : ''
    const data = await this.getGlobalSearch.execute(query, actionContextFromHttp(ctx))
    return wrapApiV1Data(data)
  }
}
