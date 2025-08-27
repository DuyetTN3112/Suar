import type { HttpContext } from '@adonisjs/core/http'

import GetPermissionMatrixQuery from '#modules/admin/actions/permissions/queries/get_permission_matrix_query'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'


export default class ShowPermissionsController {
  async handle(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const query = new GetPermissionMatrixQuery(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('admin/permissions/index', result)
  }
}
