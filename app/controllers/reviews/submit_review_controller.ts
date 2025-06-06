import type { HttpContext } from '@adonisjs/core/http'
import SubmitSkillReviewCommand from '#actions/reviews/commands/submit_skill_review_command'
import { SubmitSkillReviewDTO } from '#actions/reviews/dtos/request/review_dtos'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * POST /reviews/:id/submit → Submit skill reviews
 */
export default class SubmitReviewController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    try {
      const reviewerType = request.input('reviewer_type') as string
      if (reviewerType !== 'manager' && reviewerType !== 'peer') {
        throw new BusinessLogicException('reviewer_type must be "manager" or "peer"')
      }

      const skillRatings = request.input('skill_ratings') as Array<{
        skill_id: string
        level_code: string
      }>

      const dto = new SubmitSkillReviewDTO({
        review_session_id: params.id as string,
        reviewer_type: reviewerType,
        skill_ratings: skillRatings.map((rating) => ({
          skill_id: rating.skill_id,
          assigned_level_code: rating.level_code,
        })),
      })

      const command = new SubmitSkillReviewCommand(ctx)
      await command.handle(dto)

      session.flash('success', 'Review submitted successfully')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit review'
      session.flash('error', errorMessage)
    }

    response.redirect().back()
  }
}
