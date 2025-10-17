import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewCollectionApiBody } from './mappers/response/review_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import ListPendingSprintReviewPackagesQuery from '#modules/reviews/actions/queries/list_pending_sprint_review_packages_query'

export default class ListPendingSprintReviewPackagesController {
  async handle(ctx: HttpContext) {
    const packages = await new ListPendingSprintReviewPackagesQuery(
      actionContextFromHttp(ctx)
    ).handle({
      page: ctx.request.input('page'),
      perPage:
        (ctx.request.input('perPage') as unknown) ??
        (ctx.request.input('per_page') as unknown) ??
        (ctx.request.input('limit') as unknown),
    })

    return mapReviewCollectionApiBody(packages.data, {
      total: packages.meta.total,
      per_page: packages.meta.perPage,
      current_page: packages.meta.currentPage,
      last_page: packages.meta.lastPage,
    })
  }
}
