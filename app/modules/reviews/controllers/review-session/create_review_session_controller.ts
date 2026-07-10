import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateReviewSessionDTO } from '../mappers/request/review-core/review_request_mapper.js'
import { mapCreateReviewSessionApiBody } from '../mappers/response/review-core/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

/**
 * POST /api/reviews/sessions → Create review session (after task completion)
 */
@inject()
export default class CreateReviewSessionController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response } = ctx

    const dto = buildCreateReviewSessionDTO(request)

    const command = this.actions.makeCreateReviewSessionCommand(actionContextFromHttp(ctx))
    const session = await command.executeAndWrap(dto).then((outcome) => outcome.getValue())

    response.status(HttpStatus.CREATED)
    return mapCreateReviewSessionApiBody(session)
  }
}
