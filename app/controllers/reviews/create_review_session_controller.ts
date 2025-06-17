import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import CreateReviewSessionCommand from '#actions/reviews/commands/create_review_session_command'
import { CreateReviewSessionDTO } from '#actions/reviews/dtos/request/review_dtos'
import { HttpStatus } from '#constants/error_constants'

/**
 * POST /api/reviews/sessions → Create review session (after task completion)
 */
export default class CreateReviewSessionController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx

    const dto = new CreateReviewSessionDTO({
      task_assignment_id: request.input('task_assignment_id') as string,
      reviewee_id: request.input('reviewee_id') as string,
      required_peer_reviews: request.input('required_peer_reviews', 2) as number,
    })

    const command = new CreateReviewSessionCommand(ExecutionContext.fromHttp(ctx))
    const session = await command.handle(dto)

    response.status(HttpStatus.CREATED).json({
      success: true,
      data: session.serialize(),
    })
  }
}
