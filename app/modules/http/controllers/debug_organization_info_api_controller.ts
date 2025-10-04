import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { resolveCurrentOrganizationId } from '#modules/http/public_contracts/http_execution_context'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'

/**
 * GET /api/dev/debug-organization-info → Debug organization info (DEV ONLY)
 */
export default class DebugOrganizationInfoApiController {
  async handle(ctx: HttpContext) {
    const { auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }

    const organizationId = resolveCurrentOrganizationId(ctx) ?? undefined
    const debug = await organizationPublicApi.getDebugOrganizationInfo(user.id, organizationId)

    return wrapApiV1Data(debug)
  }
}
