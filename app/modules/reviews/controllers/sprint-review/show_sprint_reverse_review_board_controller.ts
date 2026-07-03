import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { ProjectWorkspaceAccessReader } from '#modules/projects/actions/ports/outbound/project_workspace_access_reader'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import { emptySprintReverseReviewBoardSection } from '#modules/reviews/domain/sprint-review/sprint_reverse_review_workflow'
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
  constructor(
    private readonly actions: ReviewActionFactory,
    private readonly workspaceAccess: ProjectWorkspaceAccessReader
  ) {}

  async handle(ctx: HttpContext) {
    const routeProjectId = typeof ctx.params['projectId'] === 'string' ? ctx.params['projectId'] : null
    const sessionProjectId: unknown = ctx.session.get('current_project_id')
    const projectId = routeProjectId ?? (typeof sessionProjectId === 'string' ? sessionProjectId : null)
    const workspaceMode = routeProjectId ? 'project' : 'personal'

    const explicitSprintId = ctx.request.input('sprint_id') as string | undefined
    const selectedWorkflowId = ctx.request.input('workflow_id') as string | undefined
    const reviewType = normalizeReviewType(ctx.request.url())
    const targetType = targetTypeForReviewType(reviewType)

    if (routeProjectId) {
      const user = ctx.auth.user
      const canEnterProjectWorkspace = Boolean(
        user &&
          (await this.workspaceAccess.canEnter({
            organizationId: requireCurrentOrganizationId(ctx),
            projectId: routeProjectId,
            userId: user.id,
          }))
      )
      if (!canEnterProjectWorkspace) {
        const query = new URLSearchParams()
        if (explicitSprintId) query.set('sprint_id', explicitSprintId)
        if (selectedWorkflowId) query.set('workflow_id', selectedWorkflowId)
        const suffix = query.size > 0 ? `?${query.toString()}` : ''
        const board = reviewType === 'environment' ? 'environment' : 'assigners'
        return ctx.response.redirect(`/reviews/${board}${suffix}`)
      }
    }

    const actionContext = actionContextFromHttp(ctx)

    if (!projectId) {
      return ctx.inertia.render('reviews/sprint-reverse-board', {
        actorUserId: actionContext.userId,
        sprintId: null,
        reviewWindow: null,
        board: {
          assigner: emptySprintReverseReviewBoardSection(),
          environment: emptySprintReverseReviewBoardSection(),
        },
        reviewType,
        targetType,
        selectedWorkflowId: selectedWorkflowId ?? null,
        workspaceMode,
        projectContext: { selectedProject: null },
      })
    }

    const page = await this.actions
      .makeGetSprintReverseReviewPageQuery(actionContext)
      .executeAndWrap({
        projectId,
        sprintId: explicitSprintId ?? null,
      })
      .then((outcome) => outcome.getValue())

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
      workspaceMode,
      projectContext: {
        selectedProject: page.project,
      },
    })
  }
}
