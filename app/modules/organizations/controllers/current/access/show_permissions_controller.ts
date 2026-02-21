import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetAccessConfigurationQuery from '#modules/organizations/actions/current/access/queries/get_access_configuration_query'

export default class ShowPermissionsController {
  async handle(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const query = new GetAccessConfigurationQuery(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('org/permissions/index', result)
  }
}
