import type { HttpContext } from '@adonisjs/core/http'

import GetSubscriptionQrCatalogQuery from '#modules/admin/actions/packages/queries/get_subscription_qr_catalog_query'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'


export default class ShowQrCodesController {
  async handle(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const query = new GetSubscriptionQrCatalogQuery(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('admin/qr_codes/index', result)
  }
}
