import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateMemberRoleCommand from '#actions/organizations/commands/update_member_role_command'
import { UpdateMemberRoleDTO } from '#actions/organizations/dtos/request/update_member_role_dto'
import CreateNotification from '#actions/common/create_notification'
import loggerService from '#services/logger_service'
import { HttpStatus } from '#constants/error_constants'

/**
 * POST /organizations/:id/members/update-role/:userId
 * Update a member's role in the organization
 */
export default class UpdateMemberRoleController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const updateMemberRole = new UpdateMemberRoleCommand(
      ExecutionContext.fromHttp(ctx),
      new CreateNotification()
    )

    try {
      const body = request.body() as { roleId: string }
      const roleId = body.roleId

      const dto = new UpdateMemberRoleDTO(params.id as string, params.userId as string, roleId)
      await updateMemberRole.execute(dto)

      if (request.accepts(['html', 'json']) === 'json') {
        response.json({
          success: true,
          message: 'Cập nhật vai trò thành công',
        })
        return
      }

      session.flash('success', 'Cập nhật vai trò thành công')
      response.redirect().toRoute('organizations.members.index', { id: params.id as string })
      return
    } catch (error: unknown) {
      loggerService.error('[UpdateMemberRoleController.handle] Error:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật vai trò'

      if (request.accepts(['html', 'json']) === 'json') {
        response.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      session.flash('error', errorMessage)
      response.redirect().toRoute('organizations.members.index', { id: params.id as string })
      return
    }
  }
}
