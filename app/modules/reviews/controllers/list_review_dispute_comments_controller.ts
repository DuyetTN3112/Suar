import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewCommentCollectionApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import ListReviewDisputeCommentsQuery from '#modules/reviews/actions/queries/list_review_dispute_comments_query'

export default class ListReviewDisputeCommentsController {
  async handle(ctx: HttpContext) {
    const comments = await new ListReviewDisputeCommentsQuery(actionContextFromHttp(ctx)).execute({
      dispute_id: ctx.params['disputeId'] as string,
    })

    ctx.response.status(HttpStatus.OK)
    return mapReviewCommentCollectionApiBody(comments)
  }
}
