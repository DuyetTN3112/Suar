import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteOrganizationDTO } from '../mappers/request/directory/organization_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationDeletionCommandFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_deletion_command_factory'

@inject()
export default class DeleteOrganizationApiController {
  constructor(private readonly deletionCommands: OrganizationDeletionCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx

    const dto = buildDeleteOrganizationDTO(request, params['organizationId'])
    await this.deletionCommands
      .make(actionContextFromHttp(ctx))
      .executeAndWrap(dto)
      .then((outcome) => outcome.getValue())

    response.noContent()
  }
}
