import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildSearchApiRequest } from '../mappers/request/search-discovery/search_api_request_mapper.js'

import GetGlobalSearchQuery from '#modules/http/actions/queries/search-discovery/get_global_search_query'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

@inject()
export default class SearchApiController {
  constructor(private readonly getGlobalSearch: GetGlobalSearchQuery) {}

  async handle(ctx: HttpContext) {
    const { query } = buildSearchApiRequest(ctx.request.input('q'))
    const data = await this.getGlobalSearch
      .executeAndWrap(query, actionContextFromHttp(ctx))
      .then((outcome) => outcome.getValue())
    return wrapApiV1Data(data)
  }
}
