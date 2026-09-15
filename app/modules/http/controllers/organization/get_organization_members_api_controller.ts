import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildOrganizationMembersRequest } from '../mappers/request/organization/organization_members_request_mapper.js'

import GetOrganizationMembersQuery from '#modules/http/actions/queries/organization/get_organization_members_query'
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
    const input = buildOrganizationMembersRequest(ctx.params, ctx.request)
    const result = await this.getOrganizationMembers
      .executeAndWrap(input.organizationId, input.q)
      .then((outcome) => outcome.getValue())

    return wrapApiV1Data({
      organization: result.organization,
      members: result.members.map(mapApiV1OrganizationMemberResponse),
    })
  }
}
