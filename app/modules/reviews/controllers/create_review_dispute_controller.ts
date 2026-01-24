import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateReviewDisputeDTO } from './mappers/request/review_request_mapper.js'
import { mapReviewDataApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class CreateReviewDisputeController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const dto = buildCreateReviewDisputeDTO(ctx.request)
    const dispute = await this.actions
      .makeCreateReviewDisputeCommand(actionContextFromHttp(ctx))
      .execute(dto)

    ctx.response.status(HttpStatus.CREATED)
    return mapReviewDataApiBody(dispute)
  }
}
