import type { HttpContext } from '@adonisjs/core/http'

import GetHttpDebugOrganizationInfoQuery from '#actions/http/queries/get_debug_organization_info_query'
import UnauthorizedException from '#exceptions/unauthorized_exception'

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
    const debug = await new GetHttpDebugOrganizationInfoQuery().execute(user.id, sessionOrgId)

    response.json({ success: true, debug })
  }
}
