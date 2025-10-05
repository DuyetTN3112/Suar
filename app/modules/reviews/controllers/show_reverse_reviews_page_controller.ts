import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import {
  normalizePagination,
  fromLegacySnakePagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import ListReverseReviewsQuery from '#modules/reviews/actions/queries/list_reverse_reviews_query'
import type {
  ReverseReviewPaginationResult,
  ReverseReviewReadResult,
  ReverseReviewReadScope,
} from '#modules/reviews/actions/queries/list_reverse_reviews_query'
import ListUserReviewHistoryQuery from '#modules/reviews/actions/queries/list_user_review_history_query'
import { REVIEW_PAGINATION } from '#modules/reviews/application/dtos/common/review_pagination'

function inferScope(ctx: HttpContext): ReverseReviewReadScope {
  const url = ctx.request.url()
  if (url.includes('/admin/reverse-reviews')) return 'admin'
  if (url.includes('/org/reverse-reviews')) return 'org'
  return 'me'
}

function resolveTargetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    manager: 'Quản lý',
    peer: 'Môi trường làm việc',
    reviewee: 'Người được review',
    self: 'Bản thân',
    organization: 'Tổ chức',
    project: 'Dự án',
  }
  return labels[type] ?? type
}

function resolveTargetLabel(review: ReverseReviewReadResult): string {
  return review.target_label ?? resolveTargetTypeLabel(review.target_type)
}

function toFriendlyRows(records: ReverseReviewReadResult[], scope: string) {
  return records.map((review) => ({
    id: review.id,
    targetLabel: resolveTargetLabel(review),
    targetType: review.target_type,
    targetTypeLabel: resolveTargetTypeLabel(review.target_type),
    authorLabel:
      scope === 'org' && review.is_anonymous
        ? 'Ẩn danh'
        : (review.reviewer_username ?? review.reviewer_id ?? 'Không rõ'),
    submittedAtLabel: formatDate(review.created_at),
    rating: review.rating,
    comment: review.comment,
    isAnonymous: review.is_anonymous,
  }))
}

function formatDate(value: unknown): string {
  try {
    return new Date(String(value)).toLocaleString()
  } catch {
    return 'Unknown'
  }
}

export default class ShowReverseReviewsPageController {
  async handle(ctx: HttpContext) {
    const scope = inferScope(ctx)
    const actionContext = actionContextFromHttp(ctx)

    if (scope === 'me') {
      const history = await new ListUserReviewHistoryQuery(actionContext).handle()
      return ctx.inertia.render('reviews/reverse-reviews', {
        mode: 'user_history',
        scope,
        history,
      })
    }

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
    const result = await new ListReverseReviewsQuery(actionContext).execute({
      scope,
      page: after || before ? REVIEW_PAGINATION.DEFAULT_PAGE : pagination.page,
      perPage: pagination.perPage,
      after,
      before,
    })
    const props = this.toPageProps(result, scope)

    if (scope === 'admin') {
      return ctx.inertia.render('reviews/reverse-reviews', props)
    }

    return ctx.inertia.render('org/reverse-reviews', props)
  }

  private toPageProps(result: ReverseReviewPaginationResult, scope: ReverseReviewReadScope) {
    return {
      reviews: toFriendlyRows(result.data, scope),
      scope,
      stats: {
        total: result.stats.total,
        anonymous: result.stats.anonymous,
        byTargetType: result.stats.by_target_type,
      },
      pagination: toCanonicalPagePagination(fromLegacySnakePagination(result.meta)),
    }
  }
}
