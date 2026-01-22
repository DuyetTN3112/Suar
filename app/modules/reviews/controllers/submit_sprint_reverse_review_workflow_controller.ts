import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import { requireRouteParam } from '#modules/reviews/controllers/mappers/request/route_params'
import { resolveSprintReverseReviewBoardRedirectPath } from '#modules/reviews/controllers/mappers/response/reverse_review_board_redirect_mapper'

@inject()
export default class SubmitSprintReverseReviewWorkflowController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const workflowId = requireRouteParam(ctx.params, 'workflowId')
    const outcome = await this.actions
      .makeSubmitSprintReverseReviewWorkflowCommand(actionContextFromHttp(ctx))
      .execute({
        workflow_id: workflowId,
        rating: Number(ctx.request.input('rating')),
        comment: String(ctx.request.input('comment') ?? ''),
      })

    const reviewType = outcome.targetType === 'environment' ? 'environment' : 'manager'

    ctx.session.flash('success', 'Đã gửi review sau sprint')
    ctx.response
      .redirect()
      .toPath(
        resolveSprintReverseReviewBoardRedirectPath(
          ctx,
          reviewType,
          outcome.sprintId,
          outcome.projectId
        )
      )
  }
}
