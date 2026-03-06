import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { searchPublicApi } from '#modules/search/public_contracts/search_public_api'

export default class SearchApiController {
  async handle(ctx: HttpContext) {
    const q = ctx.request.input('q') as unknown
    const query = typeof q === 'string' ? q : ''
    const data = await searchPublicApi.search(query, actionContextFromHttp(ctx))
    return wrapApiV1Data(data)
  }
}
