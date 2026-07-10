import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewCollectionApiBody } from '../mappers/response/review-core/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class ListSprintReviewPackagesController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const packages = await this.actions
      .makeListSprintReviewPackagesQuery(actionContextFromHttp(ctx))
      .executeAndWrap({
        page: ctx.request.input('page'),
        perPage:
          (ctx.request.input('perPage') as unknown) ??
          (ctx.request.input('per_page') as unknown) ??
          (ctx.request.input('limit') as unknown),
      })
      .then((outcome) => outcome.getValue())

    return mapReviewCollectionApiBody(packages.data, {
      total: packages.meta.total,
      per_page: packages.meta.perPage,
      current_page: packages.meta.currentPage,
      last_page: packages.meta.lastPage,
    })
  }
}
