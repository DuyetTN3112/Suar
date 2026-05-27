import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateReviewDisputeDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import CreateReviewDisputeCommand from '#modules/reviews/actions/commands/create_review_dispute_command'

export default class CreateReviewDisputeController {
  async handle(ctx: HttpContext) {
    const dto = buildCreateReviewDisputeDTO(ctx.request)
    const dispute = await new CreateReviewDisputeCommand(actionContextFromHttp(ctx)).execute(dto)

    ctx.response.status(HttpStatus.CREATED).json(mapReviewDataApiBody(dispute))
  }
}
