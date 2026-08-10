import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildGetTaskDetailDTO } from '../mappers/request/task-reading/task_request_mapper.js'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { TaskDetailQueryFactory } from '#modules/tasks/actions/ports/inbound/task_detail_query_factory'

/**
 * GET /tasks/:taskId and /work/tasks/:taskId
 * Redirect old bookmarks to the canonical Project task card room.
 */
@inject()
export default class ShowTaskController {
  constructor(private readonly detailQueries: TaskDetailQueryFactory) {}

  async handle(ctx: HttpContext) {
    try {
      const getTaskDetailQuery = this.detailQueries.makeDetail(actionContextFromHttp(ctx))
      const result = await getTaskDetailQuery.executeAndWrap(
        buildGetTaskDetailDTO(ctx.params['taskId'] as string)
      ).then((outcome) => outcome.getValue())
      const projectId = result.task['project_id']

      if (typeof projectId !== 'string' || projectId.length === 0) {
        return ctx.response.redirect('/projects')
      }

      return ctx.response.redirect(
        `/projects/${encodeURIComponent(projectId)}/tasks?task_id=${encodeURIComponent(result.task.id)}`
      )
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        ctx.session.flash('error', error.safeMessage)
        ctx.response.redirect('/errors/not-found')
        return
      }

      throw error
    }
  }
}
