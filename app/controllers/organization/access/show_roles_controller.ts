import type { HttpContext } from '@adonisjs/core/http'

import GetAccessConfigurationQuery from '#actions/organization/access/queries/get_access_configuration_query'
import { ExecutionContext } from '#types/execution_context'

export default class ShowRolesController {
  async handle(ctx: HttpContext) {
    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new GetAccessConfigurationQuery(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('org/roles/index', result)
  }
}
