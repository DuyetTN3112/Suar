import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import RespondToTaskReviewCommand from '#modules/reviews/actions/commands/respond_to_task_review_command'
import {
  requireRouteParam,
  safeTaskDetailRedirect,
} from '#modules/reviews/controllers/support/route_params'

export default class RespondTaskReviewWorkflowController {
  async handle(ctx: HttpContext) {
    const workflowId = requireRouteParam(ctx.params, 'workflowId')
    await new RespondToTaskReviewCommand(actionContextFromHttp(ctx)).execute({
      workflowId,
      body: String(ctx.request.input('body') ?? '').trim(),
    })

    const workflow = (await db.from('task_review_workflows').where('id', workflowId).firstOrFail()) as {
      project_id: string
      task_id: string
    }
    ctx.session.flash('success', 'Đã phản hồi, task chuyển Tranh chấp')
    const fallback = `/reviews/task-board?project_id=${workflow.project_id}&task_id=${workflow.task_id}`
    ctx.response.redirect().toPath(safeTaskDetailRedirect(ctx.request.input('redirect_to'), fallback))
  }
}
