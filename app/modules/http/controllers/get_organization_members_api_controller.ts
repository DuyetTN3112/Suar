import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import GetOrganizationMembersQuery from '#modules/http/actions/queries/get_organization_members_query'
import {
  mapApiV1OrganizationMemberResponse,
  wrapApiV1Data,
} from '#modules/http/boundary/api_v1_response'

/**
 * GET /api/organization-members/:organizationId → Get organization members
 */
@inject()
export default class GetOrganizationMembersApiController {
  constructor(private readonly getOrganizationMembers: GetOrganizationMembersQuery) {}

  async handle(ctx: HttpContext) {
    const { params, request } = ctx
    const q = request.input('q') as unknown
    const result = await this.getOrganizationMembers.execute(
      params['organizationId'] as string,
      typeof q === 'string' ? q : undefined
    )

    return wrapApiV1Data({
      organization: result.organization,
      members: result.members.map(mapApiV1OrganizationMemberResponse),
    })
  }
}
