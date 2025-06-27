import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetSubscriptionQrCatalogQuery from '#actions/admin/packages/queries/get_subscription_qr_catalog_query'

export default class ShowQrCodesController {
  async handle(ctx: HttpContext) {
    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new GetSubscriptionQrCatalogQuery(execCtx)
    const result = await query.handle()

    return ctx.inertia.render('admin/qr_codes/index', result)
  }
}
