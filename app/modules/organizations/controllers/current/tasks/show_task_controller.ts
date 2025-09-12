import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { makeGetTaskDetailQuery } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * GET /org/tasks/:id
 * Show task detail while keeping the organization shell.
 */
export default class OrgShowTaskController {
  async handle(ctx: HttpContext) {
    const { default: GetTaskDetailDTO } = await import(
      '#modules/tasks/actions/dtos/request/get_task_detail_dto'
    )
    const getTaskDetailQuery = makeGetTaskDetailQuery(actionContextFromHttp(ctx))
    const result = await getTaskDetailQuery.execute(GetTaskDetailDTO.createFull(ctx.params.id as string))

    return await ctx.inertia.render('tasks/show', {
      task: result.task,
      permissions: result.permissions,
      auditLogs: result.auditLogs,
      shellMode: 'organization',
      baseRoute: '/org/tasks',
    })
  }
}
