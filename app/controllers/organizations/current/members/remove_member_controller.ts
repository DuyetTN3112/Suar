import type { HttpContext } from '@adonisjs/core/http'

import CreateNotification from '#actions/common/create_notification'
import RemoveMemberCommand from '#actions/organizations/commands/remove_member_command'
import { ErrorMessages } from '#constants/error_constants'
import { buildCurrentOrganizationRemoveMemberDTO } from '#controllers/organizations/current/mappers/request/current_organization_mutation_request_mapper'
import { mapCurrentOrganizationSuccessApiBody } from '#controllers/organizations/current/mappers/response/current_organization_mutation_response_mapper'
import BusinessLogicException from '#exceptions/business_logic_exception'
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

    await new RemoveMemberCommand(execCtx, new CreateNotification()).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(mapCurrentOrganizationSuccessApiBody('Xóa thành viên thành công'))
      return
    }

    session.flash('success', 'Xóa thành viên thành công')
    response.redirect().toRoute('org.members.index')
  }
}
