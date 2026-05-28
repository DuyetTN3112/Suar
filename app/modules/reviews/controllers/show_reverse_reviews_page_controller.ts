import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListReverseReviewsQuery from '#modules/reviews/actions/queries/list_reverse_reviews_query'
import type {
  ReverseReviewReadResult,
  ReverseReviewReadScope,
} from '#modules/reviews/actions/queries/list_reverse_reviews_query'

function inferScope(ctx: HttpContext): ReverseReviewReadScope {
  const url = ctx.request.url()
  if (url.includes('/admin/reverse-reviews')) return 'admin'
  if (url.includes('/org/reverse-reviews')) return 'org'
  return 'me'
}

function resolveTargetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    manager: 'Manager',
    peer: 'Peer',
    reviewee: 'Reviewee',
    self: 'Self',
    organization: 'Organization',
    project: 'Project',
  }
  return labels[type] ?? type
}

function resolveTargetLabel(review: ReverseReviewReadResult): string {
  return resolveTargetTypeLabel(review.target_type)
}

function summarize(records: ReverseReviewReadResult[]) {
  const anonymous = records.filter((record) => record.is_anonymous).length
  const byTargetType = records.reduce<Record<string, number>>((accumulator, record) => {
    accumulator[record.target_type] = (accumulator[record.target_type] ?? 0) + 1
    return accumulator
  }, {})

  return {
    total: records.length,
    anonymous,
    by_target_type: byTargetType,
  }
}

function toFriendlyRows(records: ReverseReviewReadResult[], scope: string) {
  return records.map((review) => ({
    id: review.id,
    target_label: resolveTargetLabel(review),
    target_type: review.target_type,
    target_type_label: resolveTargetTypeLabel(review.target_type),
    author_label: scope === 'org' && review.is_anonymous ? 'Anonymous contributor' : (review.reviewer_id ?? 'Unknown'),
    submitted_at_label: formatDate(review.created_at),
    rating: review.rating,
    comment: review.comment,
    is_anonymous: review.is_anonymous,
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
    const records = await new ListReverseReviewsQuery(actionContextFromHttp(ctx)).execute({
      scope,
    })

    const props = {
      reviews: toFriendlyRows(records, scope),
      scope,
      stats: summarize(records),
    }

    if (scope === 'admin') {
      return ctx.inertia.render('admin/reviews/reverse-reviews', props)
    }

    if (scope === 'org') {
      return ctx.inertia.render('org/reverse-reviews', props)
    }

    return ctx.inertia.render('reviews/reverse-reviews', props)
  }
}
