import type { HttpContext } from '@adonisjs/core/http'


import { buildRemoveMemberDTO } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationSuccessApiBody } from './mappers/response/organization_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import RemoveMemberCommand from '#modules/organizations/actions/commands/remove_member_command'

/**
 * DELETE /organizations/:id/members/:userId
 * Remove a member from the organization
 */
export default class RemoveMemberController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const dto = buildRemoveMemberDTO(request, params.id as string, params.userId as string)
    await new RemoveMemberCommand(actionContextFromHttp(ctx), notificationPublicApi).execute(
      dto
    )

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(mapOrganizationSuccessApiBody('Xóa thành viên thành công'))
      return
    }

    session.flash('success', 'Xóa thành viên thành công')
    response.redirect().toRoute('organizations.members.index', { id: params.id as string })
  }
}
