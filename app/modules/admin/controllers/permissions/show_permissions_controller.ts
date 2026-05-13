import type { HttpContext } from '@adonisjs/core/http'

import GetPermissionMatrixQuery from '#actions/admin/permissions/queries/get_permission_matrix_query'
import { ExecutionContext } from '#types/execution_context'

export default class ShowPermissionsController {
  async handle(ctx: HttpContext) {
    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new GetPermissionMatrixQuery(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('admin/permissions/index', result)
  }
}
