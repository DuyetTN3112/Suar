import type { HttpContext } from '@adonisjs/core/http'

import { buildSubmitSkillReviewDTO } from './mappers/request/review_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import SubmitSkillReviewCommand from '#modules/reviews/actions/commands/submit_skill_review_command'

/**
 * POST /reviews/:id/submit → Submit skill reviews
 */
export default class SubmitReviewController {
  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    const dto = buildSubmitSkillReviewDTO(request, params.id as string)

    const command = new SubmitSkillReviewCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Review submitted successfully')

    response.redirect().back()
  }
}
