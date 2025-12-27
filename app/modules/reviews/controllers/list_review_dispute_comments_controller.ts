import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewCommentCollectionApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ListReviewDisputeCommentsQuery from '#modules/reviews/actions/queries/list_review_dispute_comments_query'

export default class ListReviewDisputeCommentsController {
  async handle(ctx: HttpContext) {
    const comments = await new ListReviewDisputeCommentsQuery(actionContextFromHttp(ctx)).execute({
      dispute_id: ctx.params.id as string,
    })

    ctx.response.status(HttpStatus.OK).json(mapReviewCommentCollectionApiBody(comments))
  }
}
