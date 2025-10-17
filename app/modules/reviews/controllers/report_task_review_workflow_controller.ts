import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import ReportTaskReviewDisputeCommand from '#modules/reviews/actions/commands/report_task_review_dispute_command'
import {
  requireRouteParam,
  safeTaskDetailRedirect,
} from '#modules/reviews/controllers/support/route_params'

export default class ReportTaskReviewWorkflowController {
  async handle(ctx: HttpContext) {
    const workflowId = requireRouteParam(ctx.params, 'workflowId')
    await new ReportTaskReviewDisputeCommand(actionContextFromHttp(ctx)).execute({
      workflowId,
      reason: String(ctx.request.input('reason') ?? '').trim(),
    })

    const workflow = (await db.from('task_review_workflows').where('id', workflowId).firstOrFail()) as {
      project_id: string
      task_id: string
    }
    ctx.session.flash('success', 'Đã gửi report tranh chấp lên admin')
    const fallback = `/reviews/task-board?project_id=${workflow.project_id}&task_id=${workflow.task_id}`
    ctx.response.redirect().toPath(safeTaskDetailRedirect(ctx.request.input('redirect_to'), fallback))
  }
}
