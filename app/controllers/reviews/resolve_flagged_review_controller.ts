import type { HttpContext } from '@adonisjs/core/http'
import ResolveFlaggedReviewCommand from '#actions/reviews/commands/resolve_flagged_review_command'
import type { ResolveFlaggedReviewDTO } from '#actions/reviews/commands/resolve_flagged_review_command'

/**
 * POST /admin/flagged-reviews/:id/resolve → Resolve a flagged review (dismiss or confirm)
 */
export default class ResolveFlaggedReviewController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    try {
      const dto: ResolveFlaggedReviewDTO = {
        flagged_review_id: params.id as string,
        action: request.input('action') as 'dismissed' | 'confirmed',
        notes: request.input('notes') as string | null,
      }

      const command = new ResolveFlaggedReviewCommand(ctx)
      await command.handle(dto)

      const message =
        dto.action === 'dismissed'
          ? 'Flagged review đã được bỏ qua'
          : 'Flagged review đã được xác nhận là bất thường'
      session.flash('success', message)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể xử lý flagged review'
      session.flash('error', errorMessage)
    }

    response.redirect().back()
  }
}
