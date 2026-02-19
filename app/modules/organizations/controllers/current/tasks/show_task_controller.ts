import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { taskPublicApi } from '#modules/tasks/public_contracts/task_public_api'

/**
 * GET /org/tasks/:id
 * Show task detail while keeping the organization shell.
 */
export default class OrgShowTaskController {
  async handle(ctx: HttpContext) {
    const result = await taskPublicApi.getTaskDetailPage(
      ctx.params['taskId'] as string,
      actionContextFromHttp(ctx)
    )

    return await ctx.inertia.render('tasks/show', {
      task: result.task,
      permissions: result.permissions,
      auditLogs: result.auditLogs,
      taskReviewDetail: result.taskReviewDetail ?? null,
      shellMode: 'organization',
      baseRoute: '/org/tasks/board',
    })
  }
}
