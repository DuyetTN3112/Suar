import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateMemberRoleCommand from '#actions/organizations/commands/update_member_role_command'
import CreateNotification from '#actions/common/create_notification'
import { OrganizationRole } from '#constants/organization_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import { mapOrganizationSuccessApiBody } from '#controllers/organizations/mapper/response/organization_response_mapper'

/**
 * UpdateMemberRoleController
 *
 * Update member org_role
 *
 * PUT /org/members/:id/role
 */
export default class UpdateMemberRoleController {
  async handle(ctx: HttpContext) {
    const { request, response, session, params } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const targetUserId = params.id as string
    const newRoleId =
      (request.input('roleId') as string | undefined) ??
      (request.input('org_role') as string | undefined) ??
      OrganizationRole.MEMBER
    await new UpdateMemberRoleCommand(execCtx, new CreateNotification()).executeFromRequest(
      {
        organizationId,
        userId: targetUserId,
        roleId: newRoleId,
      },
      { resolveAssignableRoles: true }
    )

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(mapOrganizationSuccessApiBody('Cập nhật vai trò thành công'))
      return
    }

    session.flash('success', 'Cập nhật vai trò thành công')
    response.redirect().toRoute('org.members.index')
  }
}
