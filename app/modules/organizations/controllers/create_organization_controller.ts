import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateOrganizationDTO } from './mappers/request/organization_request_mapper.js'

import { notificationPublicApi } from '#actions/notifications/public_api'
import CreateOrganizationCommand from '#actions/organizations/commands/create_organization_command'
import { ExecutionContext } from '#types/execution_context'

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
      ExecutionContext.fromHttp(ctx),
      notificationPublicApi
    )

    const dto = buildCreateOrganizationDTO(request)

    const organization = await createOrganization.execute(dto)

    session.flash('success', 'Tổ chức đã được tạo thành công')
    response.redirect().toRoute('organizations.show', { id: organization.id })
  }
}
