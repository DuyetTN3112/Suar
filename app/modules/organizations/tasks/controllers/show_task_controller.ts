import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationTaskQueryFactory } from '#modules/organizations/tasks/actions/ports/inbound/organization_task_query_factory'

/**
 * GET /org/tasks/:id
 * Redirect the retired Organization task detail to the Project task card room.
 */
@inject()
export default class OrgShowTaskController {
  constructor(private readonly actions: OrganizationTaskQueryFactory) {}

  async handle(ctx: HttpContext) {
    const context = actionContextFromHttp(ctx)
    if (!context.organizationId) {
      throw NotFoundException.organization()
    }

    const taskId = ctx.params['taskId'] as string
    const result = await this.actions.makeDetail(context).execute({
      taskId,
      organizationId: context.organizationId,
    })
    const taskRecord = result.task as Record<string, unknown>
    const projectId =
      typeof taskRecord['project_id'] === 'string' ? taskRecord['project_id'] : null

    if (!projectId) {
      return ctx.response.redirect('/org/projects')
    }

    return ctx.response.redirect(
      `/projects/${encodeURIComponent(projectId)}/tasks?task_id=${encodeURIComponent(taskId)}`
    )
  }
}
