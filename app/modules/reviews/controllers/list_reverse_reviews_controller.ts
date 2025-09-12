import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewCollectionApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListReverseReviewsQuery from '#modules/reviews/actions/queries/list_reverse_reviews_query'
import type { ReverseReviewReadScope } from '#modules/reviews/actions/queries/list_reverse_reviews_query'

function inferScope(ctx: HttpContext): ReverseReviewReadScope {
  const url = ctx.request.url()
  if (url.includes('/api/admin/reverse-reviews')) return 'admin'
  if (url.includes('/api/org/reverse-reviews')) return 'org'
  return 'me'
}

export default class ListReverseReviewsController {
  async handle(ctx: HttpContext) {
    const records = await new ListReverseReviewsQuery(actionContextFromHttp(ctx)).execute({
      scope: inferScope(ctx),
    })

    ctx.response.status(HttpStatus.OK).json(mapReviewCollectionApiBody(records))
  }
}
