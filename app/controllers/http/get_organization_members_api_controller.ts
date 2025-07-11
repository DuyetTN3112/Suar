import type { HttpContext } from '@adonisjs/core/http'

import GetHttpOrganizationMembersApiQuery from '#actions/http/queries/get_organization_members_api_query'

/**
 * GET /api/organization-members/:id → Get organization members
 */
export default class GetOrganizationMembersApiController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const query = new GetHttpOrganizationMembersApiQuery()
    const result = await query.execute(params.id as string)

    response.json({
      success: true,
      organization: result.organization,
      members: result.members,
    })
  }
}
