import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewCollectionApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import ListReverseReviewsQuery from '#modules/reviews/actions/queries/list_reverse_reviews_query'
import type { ReverseReviewReadScope } from '#modules/reviews/actions/queries/list_reverse_reviews_query'
import { REVIEW_PAGINATION } from '#modules/reviews/application/dtos/common/review_pagination'
import { readReverseReviewScope } from '#modules/reviews/boundary/reverse_review_http_scope'

function inferScope(ctx: HttpContext): ReverseReviewReadScope {
  return readReverseReviewScope(ctx) ?? 'me'
}

export default class ListReverseReviewsController {
  async handle(ctx: HttpContext) {
    const after = ctx.request.input('after', null) as string | null
    const before = ctx.request.input('before', null) as string | null
    const pagination = normalizePagination(
      {
        page: ctx.request.input('page', REVIEW_PAGINATION.DEFAULT_PAGE) as unknown,
        perPage: ctx.request.input(
          'perPage',
          ctx.request.input('per_page', REVIEW_PAGINATION.DEFAULT_PER_PAGE)
        ) as unknown,
      },
      REVIEW_PAGINATION
    )
    const records = await new ListReverseReviewsQuery(actionContextFromHttp(ctx)).execute({
      scope: inferScope(ctx),
      page: after || before ? REVIEW_PAGINATION.DEFAULT_PAGE : pagination.page,
      perPage: pagination.perPage,
      after,
      before,
    })

    ctx.response.status(HttpStatus.OK)
    return mapReviewCollectionApiBody(records.data, records.meta)
  }
}
