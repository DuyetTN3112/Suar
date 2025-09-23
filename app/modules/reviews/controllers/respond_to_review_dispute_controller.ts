import type { HttpContext } from '@adonisjs/core/http'

import { buildRespondToReviewDisputeDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDisputeCommentApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import RespondToReviewDisputeCommand from '#modules/reviews/actions/commands/respond_to_review_dispute_command'

export default class RespondToReviewDisputeController {
  async handle(ctx: HttpContext) {
    const dto = buildRespondToReviewDisputeDTO(ctx.request, ctx.params.id as string)
    const comment = await new RespondToReviewDisputeCommand(actionContextFromHttp(ctx)).execute(
      dto
    )

    ctx.response.status(HttpStatus.CREATED).json(mapReviewDisputeCommentApiBody(comment))
  }
}
