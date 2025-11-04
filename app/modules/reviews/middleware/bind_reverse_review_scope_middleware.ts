import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import type { ReverseReviewReadScope } from '#modules/reviews/actions/queries/list_reverse_reviews_query'
import { bindReverseReviewScope } from '#modules/reviews/boundary/reverse_review_http_scope'

export default class BindReverseReviewScopeMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    scope: ReverseReviewReadScope = 'me'
  ): Promise<void> {
    bindReverseReviewScope(ctx, scope)
    await next()
  }
}
