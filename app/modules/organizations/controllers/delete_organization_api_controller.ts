import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteOrganizationDTO } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationMutationApiBody } from './mappers/response/organization_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import DeleteOrganizationCommand from '#modules/organizations/actions/commands/delete_organization_command'

export default class DeleteOrganizationApiController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx

    const dto = buildDeleteOrganizationDTO(request, params.id as string)
    await new DeleteOrganizationCommand(actionContextFromHttp(ctx)).execute(dto)

    response.json(mapOrganizationMutationApiBody('Tổ chức đã được xóa'))
  }
}
