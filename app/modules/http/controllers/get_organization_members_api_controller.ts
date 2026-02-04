import type { HttpContext } from '@adonisjs/core/http'

import { organizationPublicApi } from '#actions/organizations/public_api'

/**
 * GET /api/organization-members/:id → Get organization members
 */
export default class GetOrganizationMembersApiController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const result = await organizationPublicApi.getOrganizationMembersApi(params.id as string)

    response.json({
      success: true,
      organization: result.organization,
      members: result.members,
    })
  }
}
