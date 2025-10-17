import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import AcceptSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/accept_sprint_reverse_review_workflow_command'
import { requireRouteParam } from '#modules/reviews/controllers/support/route_params'

export default class AcceptSprintReverseReviewWorkflowController {
  async handle(ctx: HttpContext) {
    const workflowId = requireRouteParam(ctx.params, 'workflowId')
    const workflow = (await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .select('sprint_id', 'target_type')
      .firstOrFail()) as { sprint_id: string; target_type: string }

    await new AcceptSprintReverseReviewWorkflowCommand(actionContextFromHttp(ctx)).execute({
      workflow_id: workflowId,
    })

    const reviewType = workflow.target_type === 'environment' ? 'environment' : 'manager'

    ctx.session.flash('success', 'Đã đồng ý review sau sprint')
    ctx.response.redirect().toPath(
      `/reviews/sprint-reverse-board?review_type=${reviewType}&sprint_id=${workflow.sprint_id}`
    )
  }
}
