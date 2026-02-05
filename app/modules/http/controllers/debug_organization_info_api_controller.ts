import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#exceptions/unauthorized_exception'
import { organizationPublicApi } from '#modules/organizations/actions/public_api'

/**
 * GET /api/debug-organization-info → Debug organization info (DEV ONLY)
 */
export default class DebugOrganizationInfoApiController {
  async handle({ auth, session, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }

    const sessionOrgId = session.get('current_organization_id') as string | undefined
    const debug = await organizationPublicApi.getDebugOrganizationInfo(user.id, sessionOrgId)

    response.json({ success: true, debug })
  }
}
