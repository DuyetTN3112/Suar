import type { HttpContext } from '@adonisjs/core/http'

import {
  mapApiV1OrganizationMemberResponse,
  wrapApiV1Data,
} from '#modules/http/api_v1/response_mappers'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import { mapOrganizationDetailApiBody } from '#modules/organizations/public_contracts/organization_serialization'

/**
 * GET /api/organization-members/:organizationId → Get organization members
 */
export default class GetOrganizationMembersApiController {
  async handle(ctx: HttpContext) {
    const { params, request } = ctx
    const q = request.input('q') as unknown
    const result = await organizationPublicApi.getOrganizationMembersApi(
      params['organizationId'] as string,
      typeof q === 'string' ? q : undefined
    )

    return wrapApiV1Data({
      organization: mapOrganizationDetailApiBody(result.organization).data,
      members: result.members.map(mapApiV1OrganizationMemberResponse),
    })
  }
}
