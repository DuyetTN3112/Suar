import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateOrganizationDTO } from './mappers/request/organization_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import CreateOrganizationCommand from '#modules/organizations/actions/commands/create_organization_command'

/**
 * GET /organizations/create — show form
 * POST /organizations — store new organization
 */
export default class CreateOrganizationController {
  async showForm({ inertia }: HttpContext) {
    return await inertia.render('organizations/create', {})
  }

  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const createOrganization = new CreateOrganizationCommand(
      actionContextFromHttp(ctx),
      notificationPublicApi
    )

    const dto = buildCreateOrganizationDTO(request)

    const organization = await createOrganization.execute(dto)

    session.flash('success', 'Tổ chức đã được tạo thành công')
    response.redirect().toRoute('organizations.show', { id: organization.id })
  }
}
