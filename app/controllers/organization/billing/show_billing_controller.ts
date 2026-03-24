import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetBillingInfoQuery from '#actions/organization/billing/queries/get_billing_info_query'

/**
 * ShowBillingController
 *
 * Show billing info
 *
 * GET /org/billing
 */
export default class ShowBillingController {
  async handle({ inertia, request }: HttpContext) {
    const execCtx = ExecutionContext.fromHttp({ request } as any)

    // Execute query
    const query = new GetBillingInfoQuery(execCtx)
    const result = await query.handle({})

    return inertia.render('org/billing/index', result)
  }
}
