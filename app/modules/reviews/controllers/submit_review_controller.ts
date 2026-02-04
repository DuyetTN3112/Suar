import type { HttpContext } from '@adonisjs/core/http'

import { buildSubmitSkillReviewDTO } from './mappers/request/review_request_mapper.js'

import SubmitSkillReviewCommand from '#actions/reviews/commands/submit_skill_review_command'
import { ExecutionContext } from '#types/execution_context'

/**
 * POST /reviews/:id/submit → Submit skill reviews
 */
export default class SubmitReviewController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    const dto = buildSubmitSkillReviewDTO(request, params.id as string)

    const command = new SubmitSkillReviewCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Review submitted successfully')

    response.redirect().back()
  }
}
