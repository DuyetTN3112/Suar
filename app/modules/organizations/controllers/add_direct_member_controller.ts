import type { HttpContext } from '@adonisjs/core/http'


import { buildAddDirectMemberDTO } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationSuccessApiBody } from './mappers/response/organization_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import AddMemberCommand from '#modules/organizations/actions/commands/add_member_command'

/**
 * POST /organizations/:id/members/add-direct
 * Add user directly to organization (for admin)
 */
export default class AddDirectMemberController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const dto = buildAddDirectMemberDTO(request, params.id as string)
    await new AddMemberCommand(actionContextFromHttp(ctx), notificationPublicApi).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(mapOrganizationSuccessApiBody('Thêm thành viên thành công'))
      return
    }

    session.flash('success', 'Thêm thành viên thành công')
    response.redirect().toRoute('organizations.members.index', { id: params.id as string })
  }
}
