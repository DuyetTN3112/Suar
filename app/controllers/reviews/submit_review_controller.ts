import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import SubmitSkillReviewCommand from '#actions/reviews/commands/submit_skill_review_command'
import { SubmitSkillReviewDTO } from '#actions/reviews/dtos/request/review_dtos'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ReviewerType } from '#constants/review_constants'
import { ErrorMessages } from '#constants/error_constants'

/**
 * POST /reviews/:id/submit → Submit skill reviews
 */
export default class SubmitReviewController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    const reviewerType = request.input('reviewer_type') as string
    const reviewerTypes = Object.values(ReviewerType) as string[]
    if (!reviewerTypes.includes(reviewerType)) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    const skillRatings = request.input('skill_ratings') as Array<{
      skill_id: string
      level_code: string
    }>

    const dto = new SubmitSkillReviewDTO({
      review_session_id: params.id as string,
      reviewer_type: reviewerType as ReviewerType,
      skill_ratings: skillRatings.map((rating) => ({
        skill_id: rating.skill_id,
        assigned_level_code: rating.level_code,
      })),
      overall_quality_score: request.input('overall_quality_score') as number | undefined,
      delivery_timeliness: request.input('delivery_timeliness') as string | undefined,
      requirement_adherence: request.input('requirement_adherence') as number | undefined,
      communication_quality: request.input('communication_quality') as number | undefined,
      code_quality_score: request.input('code_quality_score') as number | undefined,
      proactiveness_score: request.input('proactiveness_score') as number | undefined,
      would_work_with_again: request.input('would_work_with_again') as boolean | undefined,
      strengths_observed: request.input('strengths_observed') as string | undefined,
      areas_for_improvement: request.input('areas_for_improvement') as string | undefined,
    })

    const command = new SubmitSkillReviewCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Review submitted successfully')

    response.redirect().back()
  }
}
