import type { HttpContext } from '@adonisjs/core/http'

import {
  buildCreateReviewDisputeCommentDTO,
} from './mappers/request/review_request_mapper.js'
import { mapReviewDisputeCommentApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import CreateReviewDisputeCommentCommand from '#modules/reviews/actions/commands/create_review_dispute_comment_command'

export default class CreateReviewDisputeCommentController {
  async handle(ctx: HttpContext) {
    const dto = buildCreateReviewDisputeCommentDTO(ctx.request, ctx.params.id as string)
    const comment = await new CreateReviewDisputeCommentCommand(actionContextFromHttp(ctx)).execute(
      dto
    )

    ctx.response.status(HttpStatus.CREATED).json(mapReviewDisputeCommentApiBody(comment))
  }
}
