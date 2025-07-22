import type { HttpContext } from '@adonisjs/core/http'
import GetAssignableOrganizationRolesQuery from '#actions/organization/access/queries/get_assignable_organization_roles_query'
import { ExecutionContext } from '#types/execution_context'
import UpdateMemberRoleCommand from '#actions/organizations/commands/update_member_role_command'
import { UpdateMemberRoleDTO } from '#actions/organizations/dtos/request/update_member_role_dto'
import CreateNotification from '#actions/common/create_notification'
import { OrganizationRole } from '#constants/organization_constants'

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
      throw new Error('Organization context required')
    }

    const targetUserId = params.id as string
    const newRoleId =
      (request.input('roleId') as string | undefined) ??
      (request.input('org_role') as string | undefined) ??
      OrganizationRole.MEMBER

    const { roleIds: allowedRoleIds } = await new GetAssignableOrganizationRolesQuery(
      execCtx
    ).handle({
      organizationId,
    })
    const dto = new UpdateMemberRoleDTO(organizationId, targetUserId, newRoleId, allowedRoleIds)
    await new UpdateMemberRoleCommand(execCtx, new CreateNotification()).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json({ success: true, message: 'Cập nhật vai trò thành công' })
      return
    }

    session.flash('success', 'Cập nhật vai trò thành công')
    response.redirect().toRoute('org.members.index')
  }
}
