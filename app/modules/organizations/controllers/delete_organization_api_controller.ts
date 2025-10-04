import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteOrganizationDTO } from './mappers/request/organization_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import DeleteOrganizationCommand from '#modules/organizations/actions/commands/delete_organization_command'

export default class DeleteOrganizationApiController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx

    const dto = buildDeleteOrganizationDTO(request, params['organizationId'] as string)
    await new DeleteOrganizationCommand(actionContextFromHttp(ctx)).execute(dto)

    response.noContent()
  }
}
