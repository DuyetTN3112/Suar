import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminReviewActionFactory } from '#modules/admin/reviews/actions/ports/inbound/admin_review_action_factory'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'

/**
 * ResolveFlaggedReviewController
 *
 * Resolve flagged review
 *
 * PUT /admin/reviews/:id/resolve
 */
@inject()
export default class ResolveFlaggedReviewController {
  constructor(private readonly actions: AdminReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, params } = ctx
    const rawId: unknown = params['flaggedReviewId']
    if (typeof rawId !== 'string' || rawId.length === 0) {
      throw ValidationException.field('flaggedReviewId', 'Invalid flagged review id')
    }

    const rawAction: unknown = request.input('action', 'confirm')
    if (rawAction !== 'confirm' && rawAction !== 'dismiss') {
      throw ValidationException.field('action', 'Invalid resolve action')
    }

    const notes = String(request.input('notes') ?? '').trim()
    if (notes.length === 0) {
      throw ValidationException.field('notes', 'Moderation note is required')
    }

    const command = this.actions.makeResolveFlaggedReviewCommand(actionContextFromHttp(ctx))

    await command.handle({
      flaggedReviewId: rawId,
      action: rawAction,
      notes,
    })

    const successMessage =
      rawAction === 'confirm' ? 'Đã xác nhận flagged review' : 'Đã bỏ qua flagged review'

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'back',
      },
      successMessage,
    })
  }
}
