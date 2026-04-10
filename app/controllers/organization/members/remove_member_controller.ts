import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import RemoveMemberCommand from '#actions/organizations/commands/remove_member_command'
import CreateNotification from '#actions/common/create_notification'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import { buildRemoveMemberDTO } from '#controllers/organizations/mappers/request/organization_request_mapper'
import { mapOrganizationSuccessApiBody } from '#controllers/organizations/mappers/response/organization_response_mapper'

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

    const dto = buildRemoveMemberDTO(request, organizationId, params.id as string)

    await new RemoveMemberCommand(execCtx, new CreateNotification()).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(mapOrganizationSuccessApiBody('Xóa thành viên thành công'))
      return
    }

    session.flash('success', 'Xóa thành viên thành công')
    response.redirect().toRoute('org.members.index')
  }
}
