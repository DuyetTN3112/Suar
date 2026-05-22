import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminPermissionActionFactory } from '#modules/admin/permissions/actions/ports/inbound/admin_permission_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'


@inject()
export default class ShowPermissionsController {
  constructor(private readonly actions: AdminPermissionActionFactory) {}

  async system(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const query = this.actions.makeGetPermissionMatrixQuery(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('admin/permissions/system', {
      summary: result.summary,
      roles: result.systemRoles,
      catalog: result.catalogs.system,
    })
  }

  async organization(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const query = this.actions.makeGetPermissionMatrixQuery(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('admin/permissions/organization', {
      summary: result.summary,
      roles: result.organizationRoles,
      catalog: result.catalogs.organization,
    })
  }

  async project(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const query = this.actions.makeGetPermissionMatrixQuery(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('admin/permissions/project', {
      summary: result.summary,
      roles: result.projectRoles,
      catalog: result.catalogs.project,
    })
  }
}
