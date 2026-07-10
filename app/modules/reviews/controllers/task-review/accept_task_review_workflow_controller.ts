import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import { requireRouteParam } from '#modules/reviews/controllers/mappers/request/review-core/route_params'
import { safeTaskDetailRedirect } from '#modules/reviews/controllers/mappers/response/task-review/task_detail_redirect_mapper'

@inject()
export default class AcceptTaskReviewWorkflowController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const workflowId = requireRouteParam(ctx.params, 'workflowId')
    const outcome = await this.actions
      .makeAcceptTaskReviewCommand(actionContextFromHttp(ctx))
      .executeAndWrap({
        workflowId,
        reviewMessageId: String(ctx.request.input('review_message_id') ?? ''),
        decision: ctx.request.input('decision') === 'rejected' ? 'rejected' : 'accepted',
      })
      .then((result) => result.getValue())

    ctx.session.flash('success', 'Đã xử lý review này')
    const fallback = `/projects/${encodeURIComponent(outcome.projectId)}/reviews/tasks?task_id=${encodeURIComponent(outcome.taskId)}`
    ctx.response
      .redirect()
      .toPath(safeTaskDetailRedirect(ctx.request.input('redirect_to'), fallback))
  }
}
