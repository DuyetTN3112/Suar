import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetReviewShowPageQuery from '#actions/reviews/queries/get_review_show_page_query'
import { mapShowReviewPageProps } from './mappers/response/review_response_mapper.js'

/**
 * GET /reviews/:id → Show review session details
 */
export default class ShowReviewController {
  async handle(ctx: HttpContext) {
    const { params, inertia } = ctx
    const pageData = await new GetReviewShowPageQuery(ExecutionContext.fromHttp(ctx)).execute(
      params.id as string
    )

    return inertia.render(
      'reviews/show',
      mapShowReviewPageProps(pageData.session, pageData.skills, pageData.proficiencyLevels)
    )
  }
}
