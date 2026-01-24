import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminPackageActionFactory } from '#modules/admin/packages/actions/ports/inbound/admin_package_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'


@inject()
export default class ShowQrCodesController {
  constructor(private readonly actions: AdminPackageActionFactory) {}

  async handle(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const query = this.actions.makeGetSubscriptionQrCatalogQuery(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('admin/qr_codes/index', result)
  }
}
