import type { HttpContext } from '@adonisjs/core/http'

import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import CreateSprintReviewDisputeCommentCommand from '#modules/reviews/actions/commands/create_sprint_review_dispute_comment_command'

export default class CreateSprintReviewDisputeCommentController {
  async handle(ctx: HttpContext) {
    const result = await new CreateSprintReviewDisputeCommentCommand(
      actionContextFromHttp(ctx)
    ).execute({
      dispute_id: ctx.params['disputeId'] as string,
      body: String(ctx.request.input('body', '')),
      visibility: ctx.request.input('visibility', 'all_parties') as 'all_parties' | 'admin_only',
    })

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(result)
  }
}
