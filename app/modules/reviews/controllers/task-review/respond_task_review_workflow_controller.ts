import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import { requireRouteParam } from '#modules/reviews/controllers/mappers/request/review-core/route_params'
import { safeTaskDetailRedirect } from '#modules/reviews/controllers/mappers/response/task-review/task_detail_redirect_mapper'

@inject()
export default class RespondTaskReviewWorkflowController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const workflowId = requireRouteParam(ctx.params, 'workflowId')
    const outcome = await this.actions
      .makeRespondToTaskReviewCommand(actionContextFromHttp(ctx))
      .executeAndWrap({
        workflowId,
        reviewMessageId: String(ctx.request.input('review_message_id') ?? ''),
        responseMessageId: String(ctx.request.input('response_message_id') ?? '') || undefined,
        withdrawMessageId: String(ctx.request.input('withdraw_message_id') ?? '') || undefined,
        body: String(ctx.request.input('body') ?? '').trim(),
      })
      .then((result) => result.getValue())

    ctx.session.flash(
      'success',
      ctx.request.input('withdraw_message_id') ? 'Đã xóa nội dung khỏi luồng đánh giá' : 'Đã gửi phản hồi cho review này'
    )
    const fallback = `/projects/${encodeURIComponent(outcome.projectId)}/reviews/tasks?task_id=${encodeURIComponent(outcome.taskId)}`
    ctx.response
      .redirect()
      .toPath(safeTaskDetailRedirect(ctx.request.input('redirect_to'), fallback))
  }
}
