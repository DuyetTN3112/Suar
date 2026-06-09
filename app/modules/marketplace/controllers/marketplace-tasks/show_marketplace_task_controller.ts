import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { TaskDetailQueryFactory } from '#modules/tasks/actions/ports/inbound/task_detail_query_factory'
import { buildGetTaskDetailDTO } from '#modules/tasks/controllers/mappers/request/task-reading/task_request_mapper'
import { mapScopedTaskDetailPageProps } from '#modules/tasks/controllers/mappers/response/task-reading/task_response_mapper'

/**
 * GET /marketplace/tasks/:taskId
 * Render read-only public task detail for marketplace applicants.
 */
@inject()
export default class ShowMarketplaceTaskController {
  constructor(private readonly detailQueries: TaskDetailQueryFactory) {}

  async handle(ctx: HttpContext) {
    const result = await this.detailQueries
      .makeDetail(actionContextFromHttp(ctx))
      .executeAndWrap(
        buildGetTaskDetailDTO(ctx.params['taskId'] as string, 'marketplace')
      )
      .then((outcome) => outcome.getValue())

    const isOrganizationSurface = ctx.request.url().startsWith('/org/')
    const marketplaceBaseRoute = isOrganizationSurface
      ? '/org/marketplace/tasks'
      : '/marketplace/tasks'

    return ctx.inertia.render(
      isOrganizationSurface ? 'org/tasks/show' : 'tasks/show',
      mapScopedTaskDetailPageProps(result, {
        shellMode: isOrganizationSurface ? 'organization' : 'app',
        baseRoute: marketplaceBaseRoute,
      })
    )
  }
}
