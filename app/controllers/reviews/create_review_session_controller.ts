import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import CreateReviewSessionCommand from '#actions/reviews/commands/create_review_session_command'
import { HttpStatus } from '#constants/error_constants'
import { buildCreateReviewSessionDTO } from './mapper/request/review_request_mapper.js'
import { mapCreateReviewSessionApiBody } from './mapper/response/review_response_mapper.js'

/**
 * POST /api/reviews/sessions → Create review session (after task completion)
 */
export default class CreateReviewSessionController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx

    const dto = buildCreateReviewSessionDTO(request)

    const command = new CreateReviewSessionCommand(ExecutionContext.fromHttp(ctx))
    const session = await command.handle(dto)

    response.status(HttpStatus.CREATED).json(mapCreateReviewSessionApiBody(session))
  }
}
