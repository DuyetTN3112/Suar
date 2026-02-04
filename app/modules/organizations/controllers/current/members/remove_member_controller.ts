import type { HttpContext } from '@adonisjs/core/http'

import { notificationPublicApi } from '#actions/notifications/public_api'
import RemoveMemberCommand from '#actions/organizations/commands/remove_member_command'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#modules/errors/constants/error_constants'
import { buildCurrentOrganizationRemoveMemberDTO } from '#modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper'
import { mapCurrentOrganizationSuccessApiBody } from '#modules/organizations/controllers/current/mappers/response/current_organization_mutation_response_mapper'
import { ExecutionContext } from '#types/execution_context'

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
    const execCtx = ExecutionContext.fromHttp(ctx)
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
