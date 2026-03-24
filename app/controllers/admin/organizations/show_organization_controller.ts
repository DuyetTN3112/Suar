import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetOrganizationDetailsQuery from '#actions/admin/organizations/queries/get_organization_details_query'

/**
 * ShowOrganizationController
 *
 * Show organization details
 *
 * GET /admin/organizations/:id
 */
export default class ShowOrganizationController {
  async handle(ctx: HttpContext) {
    const { inertia, params } = ctx

    const execCtx = ExecutionContext.fromHttp(ctx)
    const query = new GetOrganizationDetailsQuery(execCtx)

    const organization = await query.handle({ organizationId: params.id })

    return inertia.render('admin/organizations/show', { organization })
  }
}
