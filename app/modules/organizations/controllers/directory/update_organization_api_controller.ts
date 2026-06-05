import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateOrganizationDTO } from '../mappers/request/directory/organization_request_mapper.js'
import { mapOrganizationMutationApiBody } from '../mappers/response/directory/organization_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationUpdateCommandFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_update_command_factory'

/**
 * PUT|PATCH /api/organizations/:organizationId → Update organization (compat API)
 */
@inject()
export default class UpdateOrganizationApiController {
  constructor(private readonly actions: OrganizationUpdateCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { params, request } = ctx

    const dto = buildUpdateOrganizationDTO(request, params['organizationId'])
    const organization = await this.actions
      .make(actionContextFromHttp(ctx))
      .executeAndWrap(dto)
      .then((outcome) => outcome.getValue())

    return mapOrganizationMutationApiBody(organization)
  }
}
