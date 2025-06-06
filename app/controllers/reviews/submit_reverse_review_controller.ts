import type { HttpContext } from '@adonisjs/core/http'
import SubmitReverseReviewCommand from '#actions/reviews/commands/submit_reverse_review_command'
import { SubmitReverseReviewDTO } from '#actions/reviews/dtos/request/review_dtos'
import { ReverseReviewTargetType } from '#constants/review_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * POST /reviews/:id/reverse → Submit reverse review (reviewee rating reviewer)
 */
export default class SubmitReverseReviewController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    const targetType = request.input('target_type') as string
    const validTargetTypes = Object.values(ReverseReviewTargetType) as string[]
    if (!validTargetTypes.includes(targetType)) {
      throw new BusinessLogicException(`target_type must be one of: ${validTargetTypes.join(', ')}`)
    }

    const dto = new SubmitReverseReviewDTO({
      review_session_id: params.id as string,
      target_type: targetType as SubmitReverseReviewDTO['target_type'],
      target_id: request.input('target_id') as string,
      rating: Number(request.input('rating')),
      comment: request.input('comment') as string | undefined,
      is_anonymous: Boolean(request.input('is_anonymous', false)),
    })

    const command = new SubmitReverseReviewCommand(ctx)
    await command.handle(dto)

    session.flash('success', 'Đánh giá ngược đã được gửi thành công')

    response.redirect().back()
  }
}
