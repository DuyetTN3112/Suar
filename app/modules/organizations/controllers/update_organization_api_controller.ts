import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateOrganizationDTO } from './mappers/request/organization_request_mapper.js'
import {
  mapOrganizationMutationApiBody,
  mapOrganizationDetailApiBody,
} from './mappers/response/organization_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UpdateOrganizationCommand from '#modules/organizations/actions/commands/update_organization_command'

export default class UpdateOrganizationApiController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx

    const dto = buildUpdateOrganizationDTO(request, params.id as string)
    const organization = await new UpdateOrganizationCommand(actionContextFromHttp(ctx)).execute(dto)

    response.json(
      mapOrganizationMutationApiBody('Tổ chức đã được cập nhật', {
        ...mapOrganizationDetailApiBody(organization),
      })
    )
  }
}
