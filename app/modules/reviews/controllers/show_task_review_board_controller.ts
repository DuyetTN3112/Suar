import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

@inject()
export default class ShowTaskReviewBoardController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, session, inertia, params, response } = ctx
    const projectId = typeof params['projectId'] === 'string' ? params['projectId'] : undefined

    if (!projectId) {
      response.redirect('/projects')
      return
    }

    const requestedTaskId: unknown = request.input('task_id')
    const page = await this.actions
      .makeGetTaskReviewBoardPageQuery(actionContextFromHttp(ctx))
      .execute({
        projectId,
        requestedTaskId: typeof requestedTaskId === 'string' ? requestedTaskId : null,
      })

    session.put('current_project_id', page.workspaceTransition.currentProjectId)
    await session.commit()

    return inertia.render('reviews/task-board', {
      projectId,
      board: page.board,
      selectedTaskId: page.selectedTaskId,
      detail: page.detail,
      workspaceMode: 'project',
      projectContext: {
        selectedProject: page.project,
      },
    })
  }
}
