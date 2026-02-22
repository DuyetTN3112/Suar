import type { HttpContext } from '@adonisjs/core/http'

import { mapProjectDetailPageProps } from './mappers/response/project_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import GetProjectDetailQuery from '#modules/projects/actions/queries/get_project_detail_query'

/**
 * GET /projects/:id → Show project detail
 */
export default class ShowProjectController {
  async handle(ctx: HttpContext) {
    const { auth, params, inertia, request, response } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    if (auth.user) {
      const membershipContext = await organizationPublicApi.getMembershipContext(
        organizationId,
        auth.user.id,
        undefined,
        true
      )

      if (organizationPublicApi.canAccessAdminShell(membershipContext?.role ?? null).allowed) {
        const focus = request.input('focus') as string | undefined
        const focusQuery =
          focus === 'members' ||
          focus === 'skills' ||
          focus === 'roles' ||
          focus === 'operating_model' ||
          focus === 'tasks'
            ? `?focus=${focus}`
            : ''
        response.redirect(`/org/projects/${params['projectId'] as string}${focusQuery}`)
        return
      }
    }

    const query = new GetProjectDetailQuery(actionContextFromHttp(ctx))
    const projectId = params['projectId'] as string
    const result = await query.handle({ projectId, organizationId })

    return await inertia.render('projects/show', mapProjectDetailPageProps(result))
  }
}
