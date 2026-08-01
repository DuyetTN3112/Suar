import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import GetDebugOrganizationInfoQuery from '#modules/http/actions/queries/get_debug_organization_info_query'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { resolveCurrentOrganizationId } from '#modules/http/boundary/http_execution_context'

/**
 * GET /api/dev/debug-organization-info → Debug organization info (DEV ONLY)
 */
@inject()
export default class DebugOrganizationInfoApiController {
  constructor(private readonly getDebugOrganizationInfo: GetDebugOrganizationInfoQuery) {}

  async handle(ctx: HttpContext) {
    const { auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }

    const organizationId = resolveCurrentOrganizationId(ctx) ?? undefined
    const debug = await this.getDebugOrganizationInfo.execute(user.id, organizationId)

    return wrapApiV1Data(debug)
  }
}
