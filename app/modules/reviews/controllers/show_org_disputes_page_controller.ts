import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { normalizePagination,
  fromLegacySnakePagination,
  toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import ListOrgReviewDisputesQuery from '#modules/reviews/actions/queries/list_org_review_disputes_query'
import { REVIEW_PAGINATION } from '#modules/reviews/application/dtos/common/review_pagination'

export default class ShowOrgDisputesPageController {
  async handle(ctx: HttpContext) {
    const after = ctx.request.input('after', null) as string | null
    const before = ctx.request.input('before', null) as string | null
    const status = ctx.request.input('status', null) as string | null
    const search = ctx.request.input('search', null) as string | null
    const createdAtStart = ctx.request.input('created_at_start', null) as string | null
    const createdAtEnd = ctx.request.input('created_at_end', null) as string | null
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

    const result = await new ListOrgReviewDisputesQuery(actionContextFromHttp(ctx)).execute({
      page: after || before ? REVIEW_PAGINATION.DEFAULT_PAGE : pagination.page,
      perPage: pagination.perPage,
      after,
      before,
      status,
      search,
      createdAtStart,
      createdAtEnd,
    })

    return ctx.inertia.render('org/disputes/index', {
      disputes: result.data,
      pagination: toCanonicalPagePagination(fromLegacySnakePagination(result.meta)),
      filters: { status, search, after, before, created_at_start: createdAtStart, created_at_end: createdAtEnd },
    })
  }
}
