import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ListFlaggedReviewsQuery from '#actions/admin/reviews/queries/list_flagged_reviews_query'
import { PAGINATION } from '#constants/common_constants'

const ADMIN_FLAGGED_REVIEWS_PER_PAGE = 50

/**
 * ListFlaggedReviewsController
 *
 * Show flagged reviews
 *
 * GET /admin/reviews
 */
export default class ListFlaggedReviewsController {
  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx

    const toPageNumber = (value: unknown): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(1, Math.trunc(value))
      }
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1
      }
      return 1
    }

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined
    }

    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new ListFlaggedReviewsQuery(execCtx)
    const page = toPageNumber(request.input('page', PAGINATION.DEFAULT_PAGE) as unknown)
    const search = toOptionalString(request.input('search', '') as unknown)
    const flagType = toOptionalString(request.input('flag_type', null) as unknown)
    const severity = toOptionalString(request.input('severity', null) as unknown)
    const status = toOptionalString(request.input('status', null) as unknown)

    const result = await query.handle({
      page,
      perPage: ADMIN_FLAGGED_REVIEWS_PER_PAGE,
      search,
      flagType,
      severity,
      status,
    })

    return inertia.render('admin/reviews/flagged', {
      reviews: result.data,
      meta: result.meta,
      filters: {
        search: search ?? '',
        flag_type: flagType ?? null,
        severity: severity ?? null,
        status: status ?? null,
      },
    })
  }
}
