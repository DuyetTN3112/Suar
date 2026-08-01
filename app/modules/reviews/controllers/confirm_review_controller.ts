import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildConfirmReviewDTO } from './mappers/request/review_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

/**
 * POST /reviews/:id/confirm → Confirm or dispute review
 */
@inject()
export default class ConfirmReviewController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, params, session } = ctx

    const dto = buildConfirmReviewDTO(request, params['reviewId'] as string)

    const command = this.actions.makeConfirmReviewCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    const message =
      dto.action === 'confirmed'
        ? 'Review confirmed successfully'
        : 'Review disputed. An admin will review your case.'
    session.flash('success', message)

    response.redirect().back()
  }
}
