import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import SubmitSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/submit_sprint_reverse_review_workflow_command'
import { requireRouteParam } from '#modules/reviews/controllers/support/route_params'

export default class SubmitSprintReverseReviewWorkflowController {
  async handle(ctx: HttpContext) {
    const workflowId = requireRouteParam(ctx.params, 'workflowId')
    const workflow = (await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .select('sprint_id', 'target_type')
      .firstOrFail()) as { sprint_id: string; target_type: string }

    await new SubmitSprintReverseReviewWorkflowCommand(actionContextFromHttp(ctx)).execute({
      workflow_id: workflowId,
      rating: Number(ctx.request.input('rating')),
      comment: String(ctx.request.input('comment') ?? ''),
    })

    const reviewType = workflow.target_type === 'environment' ? 'environment' : 'manager'

    ctx.session.flash('success', 'Đã gửi review sau sprint')
    ctx.response.redirect().toPath(
      `/reviews/sprint-reverse-board?review_type=${reviewType}&sprint_id=${workflow.sprint_id}`
    )
  }
}
