import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import GetProjectCreatePageQuery from '#modules/projects/actions/queries/get_project_create_page_query'

/**
 * GET /projects/create → Show create project form
 */
export default class CreateProjectController {
  async handle(ctx: HttpContext) {
    const { inertia, auth, response, session } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }

    const organizationId = session.get('current_organization_id') as string | undefined
    if (organizationId) {
      const membershipContext = await organizationPublicApi.getMembershipContext(
        organizationId,
        user.id,
        undefined,
        true
      )

      if (organizationPublicApi.canAccessAdminShell(membershipContext?.role ?? null).allowed) {
        response.redirect('/org/projects')
        return
      }
    }

    const pageData = await new GetProjectCreatePageQuery(actionContextFromHttp(ctx)).execute()

    return inertia.render('projects/create', pageData)
  }
}
