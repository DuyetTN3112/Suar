import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import GetSprintReviewPackageDetailQuery from '#modules/reviews/actions/queries/get_sprint_review_package_detail_query'

export default class ShowSprintReviewPackageController {
  async handle(ctx: HttpContext) {
    const detail = await new GetSprintReviewPackageDetailQuery(actionContextFromHttp(ctx)).handle(
      ctx.params['packageId'] as string
    )

    return mapReviewDataApiBody(detail)
  }
}
