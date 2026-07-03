import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from '../mappers/response/review-core/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class ShowSprintReviewPackageController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const detail = await this.actions
      .makeGetSprintReviewPackageDetailQuery(actionContextFromHttp(ctx))
      .executeAndWrap(ctx.params['packageId'] as string)
      .then((outcome) => outcome.getValue())

    return mapReviewDataApiBody(detail)
  }
}
