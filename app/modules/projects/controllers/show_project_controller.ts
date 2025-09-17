import type { HttpContext } from '@adonisjs/core/http'

import { mapProjectDetailPageProps } from './mappers/response/project_response_mapper.js'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import GetProjectDetailQuery from '#modules/projects/actions/queries/get_project_detail_query'

/**
 * GET /projects/:id → Show project detail
 */
export default class ShowProjectController {
  async handle(ctx: HttpContext) {
    const { auth, params, inertia, response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    if (auth.user) {
      const membershipContext = await organizationPublicApi.getMembershipContext(
        organizationId,
        auth.user.id,
        undefined,
        true
      )

      if (organizationPublicApi.canAccessAdminShell(membershipContext?.role ?? null).allowed) {
        response.redirect(`/org/projects/${params.id as string}`)
        return
      }
    }

    const query = new GetProjectDetailQuery(actionContextFromHttp(ctx))
    const projectId = params.id as string
    const result = await query.handle({ projectId, organizationId })

    return await inertia.render('projects/show', mapProjectDetailPageProps(result))
  }
}
