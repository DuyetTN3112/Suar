import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import { requireRouteParam } from '#modules/reviews/controllers/mappers/request/route_params'
import { safeTaskDetailRedirect } from '#modules/reviews/controllers/mappers/response/task_detail_redirect_mapper'

@inject()
export default class ReportTaskReviewWorkflowController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const workflowId = requireRouteParam(ctx.params, 'workflowId')
    const outcome = await this.actions
      .makeReportTaskReviewDisputeCommand(actionContextFromHttp(ctx))
      .execute({
        workflowId,
        reason: String(ctx.request.input('reason') ?? '').trim(),
      })

    ctx.session.flash('success', 'Đã gửi report tranh chấp lên admin')
    const fallback = `/projects/${encodeURIComponent(outcome.projectId)}/reviews/tasks?task_id=${encodeURIComponent(outcome.taskId)}`
    ctx.response
      .redirect()
      .toPath(safeTaskDetailRedirect(ctx.request.input('redirect_to'), fallback))
  }
}
