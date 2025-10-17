import type { HttpContext } from '@adonisjs/core/http'

import type { ReverseReviewReadScope } from '#modules/reviews/actions/queries/list_reverse_reviews_query'

const REVERSE_REVIEW_SCOPE_KEY = Symbol.for('suar.reverse_review_scope')

type ScopedHttpContext = HttpContext & {
  [REVERSE_REVIEW_SCOPE_KEY]?: ReverseReviewReadScope
}

export function bindReverseReviewScope(
  ctx: HttpContext,
  scope: ReverseReviewReadScope
): void {
  ;(ctx as ScopedHttpContext)[REVERSE_REVIEW_SCOPE_KEY] = scope
}

export function readReverseReviewScope(ctx: HttpContext): ReverseReviewReadScope | null {
  return (ctx as ScopedHttpContext)[REVERSE_REVIEW_SCOPE_KEY] ?? null
}
