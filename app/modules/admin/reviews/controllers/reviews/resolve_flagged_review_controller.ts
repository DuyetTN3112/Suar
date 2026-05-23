import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminReviewActionFactory } from '#modules/admin/reviews/actions/ports/inbound/reviews/admin_review_action_factory'
import { buildResolveFlaggedReviewRequest } from '#modules/admin/reviews/controllers/mappers/request/reviews/resolve_flagged_review_request_mapper'
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
    const input = buildResolveFlaggedReviewRequest(params, request.all())

    const command = this.actions.makeResolveFlaggedReviewCommand(actionContextFromHttp(ctx))

    await command.executeAndWrap(input).then((outcome) => outcome.getValue())

    const successMessage =
      input.action === 'confirm' ? 'Đã xác nhận flagged review' : 'Đã bỏ qua flagged review'

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'back',
      },
      successMessage,
    })
  }
}
