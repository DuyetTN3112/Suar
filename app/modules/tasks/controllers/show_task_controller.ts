import type { HttpContext } from '@adonisjs/core/http'


import { buildGetTaskDetailDTO } from './mappers/request/task_request_mapper.js'
import { mapTaskDetailPageProps } from './mappers/response/task_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { makeGetTaskDetailQuery } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * GET /tasks/:taskId
 * Show task detail
 */
export default class ShowTaskController {
  async handle(ctx: HttpContext) {
    try {
      const getTaskDetailQuery = makeGetTaskDetailQuery(actionContextFromHttp(ctx))
      const result = await getTaskDetailQuery.execute(
        buildGetTaskDetailDTO(ctx.params['taskId'] as string)
      )

      return await ctx.inertia.render('tasks/show', mapTaskDetailPageProps(result))
    } catch (error) {
      const status =
        typeof error === 'object' && error !== null && 'status' in error
          ? (error as { status?: number }).status
          : undefined

      if (status === HttpStatus.NOT_FOUND) {
        const message = error instanceof Error ? error.message : 'Không tìm thấy công việc'
        ctx.session.flash('error', message)
        ctx.response.redirect('/errors/not-found')
        return
      }

      throw error
    }
  }
}
