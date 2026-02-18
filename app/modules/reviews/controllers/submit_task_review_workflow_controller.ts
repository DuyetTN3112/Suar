import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import { requireRouteParam } from '#modules/reviews/controllers/mappers/request/route_params'
import { safeTaskDetailRedirect } from '#modules/reviews/controllers/mappers/response/task_detail_redirect_mapper'

@inject()
export default class SubmitTaskReviewWorkflowController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const taskId = requireRouteParam(ctx.params, 'taskId')
    const body = String(ctx.request.input('body') ?? '').trim()
    const execCtx = actionContextFromHttp(ctx)
    const outcome = await this.actions.makeSubmitTaskReviewWorkflowCommand(execCtx).execute({
      taskId,
      body,
    })

    ctx.session.flash('success', 'Đã gửi review task')
    const fallback = `/projects/${encodeURIComponent(outcome.projectId)}/reviews/tasks?task_id=${encodeURIComponent(outcome.taskId)}`
    ctx.response
      .redirect()
      .toPath(safeTaskDetailRedirect(ctx.request.input('redirect_to'), fallback))
  }
}
