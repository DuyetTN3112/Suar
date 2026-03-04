import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationAccessActionFactory } from '#modules/organizations/access/actions/ports/inbound/organization_access_action_factory'

@inject()
export default class ShowRolesController {
  constructor(private readonly actions: OrganizationAccessActionFactory) {}

  async handle(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const query = this.actions.makeGetAccessConfiguration(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('org/roles/index', result)
  }
}
