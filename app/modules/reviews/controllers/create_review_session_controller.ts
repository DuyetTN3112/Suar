import type { HttpContext } from '@adonisjs/core/http'


import { buildCreateReviewSessionDTO } from './mappers/request/review_request_mapper.js'
import { mapCreateReviewSessionApiBody } from './mappers/response/review_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import CreateReviewSessionCommand from '#modules/reviews/actions/commands/create_review_session_command'

/**
 * POST /api/reviews/sessions → Create review session (after task completion)
 */
export default class CreateReviewSessionController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx

    const dto = buildCreateReviewSessionDTO(request)

    const command = new CreateReviewSessionCommand(actionContextFromHttp(ctx))
    const session = await command.handle(dto)

    response.status(HttpStatus.CREATED).json(mapCreateReviewSessionApiBody(session))
  }
}
