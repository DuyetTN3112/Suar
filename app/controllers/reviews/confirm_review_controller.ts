import type { HttpContext } from '@adonisjs/core/http'
import ConfirmReviewCommand from '#actions/reviews/commands/confirm_review_command'
import { ConfirmReviewDTO } from '#actions/reviews/dtos/request/review_dtos'

/**
 * POST /reviews/:id/confirm → Confirm or dispute review
 */
export default class ConfirmReviewController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    try {
      const dto = new ConfirmReviewDTO({
        review_session_id: params.id as string,
        action: request.input('action') as 'confirmed' | 'disputed',
        dispute_reason: request.input('dispute_reason') as string | undefined,
      })

      const command = new ConfirmReviewCommand(ctx)
      await command.handle(dto)

      const message =
        dto.action === 'confirmed'
          ? 'Review confirmed successfully'
          : 'Review disputed. An admin will review your case.'
      session.flash('success', message)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to confirm review'
      session.flash('error', errorMessage)
    }

    response.redirect().back()
  }
}
