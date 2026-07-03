import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { ProjectWorkspaceAccessReader } from '#modules/projects/actions/ports/outbound/project_workspace_access_reader'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import { emptyTaskReviewBoardColumns } from '#modules/reviews/domain/task-review/task_review_workflow'

@inject()
export default class ShowTaskReviewBoardController {
  constructor(
    private readonly actions: ReviewActionFactory,
    private readonly workspaceAccess: ProjectWorkspaceAccessReader
  ) {}

  async handle(ctx: HttpContext) {
    const { request, session, inertia, params } = ctx
    const routeProjectId = typeof params['projectId'] === 'string' ? params['projectId'] : undefined
    const sessionProjectId: unknown = session.get('current_project_id')
    const projectId = routeProjectId ?? (typeof sessionProjectId === 'string' ? sessionProjectId : undefined)
    const workspaceMode = routeProjectId ? 'project' : 'personal'
    const requestedTaskId: unknown = request.input('task_id')

    // Project review routes are a shared workspace surface. A project member can
    // still review assigned work, but does so from the personal board.
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
        const query =
          typeof requestedTaskId === 'string'
            ? `?task_id=${encodeURIComponent(requestedTaskId)}`
            : ''
        return ctx.response.redirect(`/reviews/tasks${query}`)
      }
    }

    if (!projectId) {
      return inertia.render('reviews/task-board', {
        projectId: null,
        board: { projectId: null, columns: emptyTaskReviewBoardColumns() },
        selectedTaskId: null,
        detail: null,
        workspaceMode,
        projectContext: { selectedProject: null },
      })
    }

    const page = await this.actions
      .makeGetTaskReviewBoardPageQuery(actionContextFromHttp(ctx))
      .executeAndWrap({
        projectId,
        requestedTaskId: typeof requestedTaskId === 'string' ? requestedTaskId : null,
      })
      .then((outcome) => outcome.getValue())

    session.put('current_project_id', page.workspaceTransition.currentProjectId)
    await session.commit()

    return inertia.render('reviews/task-board', {
      projectId,
      board: page.board,
      selectedTaskId: page.selectedTaskId,
      detail: page.detail,
      workspaceMode,
      projectContext: {
        selectedProject: page.project,
      },
    })
  }
}
