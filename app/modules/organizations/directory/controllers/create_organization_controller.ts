import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateOrganizationDTO } from './mappers/request/organization_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationCreationCommandFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_creation_command_factory'

/**
 * GET /organizations/create — show form
 * POST /organizations — store new organization
 */
@inject()
export default class CreateOrganizationController {
  constructor(private readonly creationCommands: OrganizationCreationCommandFactory) {}

  async showForm({ inertia }: HttpContext) {
    return await inertia.render('organizations/create', {})
  }

  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const createOrganization = this.creationCommands.make(actionContextFromHttp(ctx))

    const dto = buildCreateOrganizationDTO(request)

    const organization = await createOrganization.execute(dto)

    session.flash('success', 'Tổ chức đã được tạo thành công')
    response.redirect().toRoute('organizations.show', [organization.id])
  }
}
