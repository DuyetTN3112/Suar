import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/reviews/actions/dtos/common/admin_pagination'
import { AdminReviewActionFactory } from '#modules/admin/reviews/actions/ports/inbound/admin_review_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { normalizePagination,
  toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

const ADMIN_FLAGGED_REVIEWS_PER_PAGE = 50

/**
 * ListFlaggedReviewsController
 *
 * Show flagged reviews
 *
 * GET /admin/reviews
 */
@inject()
export default class ListFlaggedReviewsController {
  constructor(private readonly actions: AdminReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined
    }

    const execCtx = actionContextFromHttp(ctx)
    const query = this.actions.makeListFlaggedReviewsQuery(execCtx)
    const after = toOptionalString(request.input('after', null) as unknown) ?? null
    const before = toOptionalString(request.input('before', null) as unknown) ?? null
    const pagination = normalizePagination(
      {
        page: request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
        perPage: ADMIN_FLAGGED_REVIEWS_PER_PAGE,
      },
      PAGINATION,
      { perPage: ADMIN_FLAGGED_REVIEWS_PER_PAGE }
    )
    const page = after || before ? PAGINATION.DEFAULT_PAGE : pagination.page
    const search = toOptionalString(request.input('search', '') as unknown)
    const flagType = toOptionalString(
      request.input('flagType', request.input('flag_type', null)) as unknown
    )
    const severity = toOptionalString(request.input('severity', null) as unknown)
    const status = toOptionalString(request.input('status', null) as unknown)

    const result = await query.handle({
      page,
      perPage: ADMIN_FLAGGED_REVIEWS_PER_PAGE,
      after,
      before,
      ...(search ? { search } : {}),
      ...(flagType ? { flagType } : {}),
      ...(severity ? { severity } : {}),
      ...(status ? { status } : {}),
    })

    return inertia.render('reviews/flagged', {
      reviews: result.data,
      pagination: toCanonicalPagePagination(result.meta),
      filters: {
        search: search ?? '',
        after,
        before,
        flag_type: flagType ?? null,
        severity: severity ?? null,
        status: status ?? null,
      },
    })
  }
}
