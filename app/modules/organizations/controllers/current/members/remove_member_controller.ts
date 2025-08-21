import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import RemoveMemberCommand from '#modules/organizations/actions/commands/remove_member_command'
import { buildCurrentOrganizationRemoveMemberDTO } from '#modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper'
import { mapCurrentOrganizationSuccessApiBody } from '#modules/organizations/controllers/current/mappers/response/current_organization_mutation_response_mapper'

/**
 * RemoveMemberController
 *
 * Remove member from org
 *
 * DELETE /org/members/:id
 */
export default class RemoveMemberController {
  async handle(ctx: HttpContext) {
    const { request, response, session, params } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = buildCurrentOrganizationRemoveMemberDTO(
      request,
      organizationId,
      params.id as string
    )

    await new RemoveMemberCommand(execCtx, notificationPublicApi).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(mapCurrentOrganizationSuccessApiBody('Xóa thành viên thành công'))
      return
    }

    session.flash('success', 'Xóa thành viên thành công')
    response.redirect().toRoute('org.members.index')
  }
}
