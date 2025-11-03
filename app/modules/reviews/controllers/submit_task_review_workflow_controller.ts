import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import EnsureTaskReviewWorkflowCommand from '#modules/reviews/actions/commands/ensure_task_review_workflow_command'
import SubmitTaskReviewCommand from '#modules/reviews/actions/commands/submit_task_review_command'
import {
  requireRouteParam,
  safeTaskDetailRedirect,
} from '#modules/reviews/controllers/support/route_params'
import { getTaskReviewDetailByTask } from '#modules/reviews/infra/repositories/read/task_review_board_queries'

export default class SubmitTaskReviewWorkflowController {
  async handle(ctx: HttpContext) {
    const taskId = requireRouteParam(ctx.params, 'taskId')
    const body = String(ctx.request.input('body') ?? '').trim()
    const execCtx = actionContextFromHttp(ctx)
    const workflow = await new EnsureTaskReviewWorkflowCommand(execCtx).execute({ taskId })

    await new SubmitTaskReviewCommand(execCtx).execute({
      workflowId: workflow.workflowId,
      body,
    })

    const requestedProjectId = String(ctx.request.input('project_id') ?? '').trim()
    let projectId = requestedProjectId

    if (!projectId) {
      const detail = await getTaskReviewDetailByTask(taskId)
      const taskRecord = detail?.['task']
      const projectIdValue =
        taskRecord && typeof taskRecord === 'object' && 'project_id' in taskRecord
          ? (taskRecord as { project_id?: unknown }).project_id
          : undefined
      projectId = typeof projectIdValue === 'string' ? projectIdValue : ''
    }

    ctx.session.flash('success', 'Đã gửi review task')
    const fallback = `/reviews/task-board?project_id=${projectId}&task_id=${taskId}`
    ctx.response.redirect().toPath(safeTaskDetailRedirect(ctx.request.input('redirect_to'), fallback))
  }
}
