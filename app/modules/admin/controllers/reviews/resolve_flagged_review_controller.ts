import type { HttpContext } from '@adonisjs/core/http'

import ResolveFlaggedReviewCommand from '#modules/admin/actions/reviews/commands/resolve_flagged_review_command'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'

/**
 * ResolveFlaggedReviewController
 *
 * Resolve flagged review
 *
 * PUT /admin/reviews/:id/resolve
 */
export default class ResolveFlaggedReviewController {
  async handle(ctx: HttpContext) {
    const { request, params } = ctx
    const rawId: unknown = params['flaggedReviewId']
    if (typeof rawId !== 'string' || rawId.length === 0) {
      throw new Error('Invalid flagged review id')
    }

    const rawAction: unknown = request.input('action', 'confirm')
    if (rawAction !== 'confirm' && rawAction !== 'dismiss') {
      throw new Error('Invalid resolve action')
    }

    const notes = request.input('notes') as string | undefined
    const command = new ResolveFlaggedReviewCommand(actionContextFromHttp(ctx))

    await command.handle({
      flaggedReviewId: rawId,
      action: rawAction,
      ...(notes ? { notes } : {}),
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
