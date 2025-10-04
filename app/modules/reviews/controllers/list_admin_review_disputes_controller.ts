import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import ListAdminReviewDisputesQuery from '#modules/reviews/actions/queries/list_admin_review_disputes_query'
import { REVIEW_PAGINATION } from '#modules/reviews/application/dtos/common/review_pagination'
import {
  mapReviewDisputeListApiBody,
} from '#modules/reviews/controllers/mappers/response/review_dispute_response_mapper'

export default class ListAdminReviewDisputesController {
  async handle(ctx: HttpContext) {
    const after = ctx.request.input('after', null) as string | null
    const before = ctx.request.input('before', null) as string | null
    const status = ctx.request.input('status', null) as string | null
    const search = ctx.request.input('search', null) as string | null
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

    const result = await new ListAdminReviewDisputesQuery(actionContextFromHttp(ctx)).execute({
      page: after || before ? REVIEW_PAGINATION.DEFAULT_PAGE : pagination.page,
      perPage: pagination.perPage,
      after,
      before,
      status,
      search,
    })

    return mapReviewDisputeListApiBody(result.data, result.meta)
  }
}
