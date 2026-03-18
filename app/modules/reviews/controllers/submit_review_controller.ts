import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildSubmitSkillReviewDTO } from './mappers/request/review_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

/**
 * POST /reviews/:id/submit → Submit skill reviews
 */
@inject()
export default class SubmitReviewController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    const dto = buildSubmitSkillReviewDTO(request, params['reviewId'] as string)

    const command = this.actions.makeSubmitSkillReviewCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Review submitted successfully')

    response.redirect().back()
  }
}
