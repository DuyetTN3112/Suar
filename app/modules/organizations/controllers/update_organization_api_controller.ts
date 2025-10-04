import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateOrganizationDTO } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationMutationApiBody } from './mappers/response/organization_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import UpdateOrganizationCommand from '#modules/organizations/actions/commands/update_organization_command'

/**
 * PUT|PATCH /api/organizations/:organizationId → Update organization (compat API)
 */
export default class UpdateOrganizationApiController {
  async handle(ctx: HttpContext) {
    const { params, request } = ctx

    const dto = buildUpdateOrganizationDTO(request, params['organizationId'] as string)
    const organization = await new UpdateOrganizationCommand(actionContextFromHttp(ctx)).execute(dto)

    return mapOrganizationMutationApiBody(organization)
  }
}
