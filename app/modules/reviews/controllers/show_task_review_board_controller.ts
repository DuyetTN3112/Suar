import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import GetTaskReviewBoardQuery from '#modules/reviews/actions/queries/get_task_review_board_query'
import { getTaskReviewDetailByTask } from '#modules/reviews/infra/repositories/read/task_review_board_queries'

export default class ShowTaskReviewBoardController {
  async handle(ctx: HttpContext) {
    const { request, session, inertia } = ctx
    const projectId =
      (request.input('project_id') as string | undefined) ??
      (session.get('current_project_id') as string | undefined)

    if (!projectId) {
      return inertia.render('reviews/task-board', {
        projectId: null,
        board: { projectId: null, columns: [] },
        selectedTaskId: null,
        detail: null,
      })
    }

    const board = await new GetTaskReviewBoardQuery(actionContextFromHttp(ctx)).execute({
      projectId,
    })
    const visibleTaskIds = board.columns.flatMap((column) =>
      column.cards.map((card) => card.taskId)
    )
    const firstTaskId = visibleTaskIds[0] ?? null
    const requestedTaskId = request.input('task_id') as string | undefined
    const selectedTaskId =
      requestedTaskId && visibleTaskIds.includes(requestedTaskId) ? requestedTaskId : firstTaskId
    const detail = selectedTaskId ? await getTaskReviewDetailByTask(selectedTaskId) : null

    const pageName = request.url().startsWith('/org/')
      ? 'org/reviews/task-board'
      : 'reviews/task-board'

    return inertia.render(pageName, {
      projectId,
      board,
      selectedTaskId,
      detail,
    })
  }
}
