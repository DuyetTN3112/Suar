import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import type { SprintReverseReviewTargetType } from '#modules/reviews/domain/sprint_reverse_review_workflow'

type SprintReverseReviewPageType = 'manager' | 'environment'

function normalizeReviewType(url: string): SprintReverseReviewPageType {
  return url.includes('/reviews/environment') ? 'environment' : 'manager'
}

function targetTypeForReviewType(
  reviewType: SprintReverseReviewPageType
): SprintReverseReviewTargetType {
  return reviewType === 'environment' ? 'environment' : 'assigner'
}

@inject()
export default class ShowSprintReverseReviewBoardController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const projectId = typeof ctx.params['projectId'] === 'string' ? ctx.params['projectId'] : null
    if (!projectId) {
      ctx.response.redirect('/projects')
      return
    }

    const explicitSprintId = ctx.request.input('sprint_id') as string | undefined
    const selectedWorkflowId = ctx.request.input('workflow_id') as string | undefined
    const reviewType = normalizeReviewType(ctx.request.url())
    const targetType = targetTypeForReviewType(reviewType)
    const actionContext = actionContextFromHttp(ctx)
    const page = await this.actions.makeGetSprintReverseReviewPageQuery(actionContext).execute({
      projectId,
      sprintId: explicitSprintId ?? null,
    })

    ctx.session.put('current_project_id', projectId)
    await ctx.session.commit()

    return ctx.inertia.render('reviews/sprint-reverse-board', {
      actorUserId: actionContext.userId,
      sprintId: page.sprintId,
      reviewWindow: page.reviewWindow,
      board: page.board,
      reviewType,
      targetType,
      selectedWorkflowId: selectedWorkflowId ?? null,
      workspaceMode: 'project',
      projectContext: {
        selectedProject: page.project,
      },
    })
  }
}
