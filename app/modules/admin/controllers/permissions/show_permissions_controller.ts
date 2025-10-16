import type { HttpContext } from '@adonisjs/core/http'

import GetPermissionMatrixQuery from '#modules/admin/actions/permissions/queries/get_permission_matrix_query'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'


export default class ShowPermissionsController {
  async system(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const query = new GetPermissionMatrixQuery(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('admin/permissions/system', {
      summary: result.summary,
      roles: result.systemRoles,
      catalog: result.catalogs.system,
    })
  }

  async organization(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const query = new GetPermissionMatrixQuery(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('admin/permissions/organization', {
      summary: result.summary,
      roles: result.organizationRoles,
      catalog: result.catalogs.organization,
    })
  }

  async project(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const query = new GetPermissionMatrixQuery(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('admin/permissions/project', {
      summary: result.summary,
      roles: result.projectRoles,
      catalog: result.catalogs.project,
    })
  }
}
