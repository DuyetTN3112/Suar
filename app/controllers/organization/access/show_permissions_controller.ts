import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetAccessConfigurationQuery from '#actions/organization/access/queries/get_access_configuration_query'

export default class ShowPermissionsController {
  async handle(ctx: HttpContext) {
    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new GetAccessConfigurationQuery(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('org/permissions/index', result)
  }
}
