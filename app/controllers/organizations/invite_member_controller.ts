import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import InviteUserCommand from '#actions/organizations/commands/invite_user_command'
import { InviteUserDTO } from '#actions/organizations/dtos/request/invite_user_dto'
import loggerService from '#services/logger_service'
import { HttpStatus } from '#constants/error_constants'

/**
 * POST /organizations/:id/members/invite
 * Invite a user to the organization
 */
export default class InviteMemberController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const inviteUser = new InviteUserCommand(ExecutionContext.fromHttp(ctx))

    try {
      const body = request.body() as { email: string; roleId: string }
      const email = body.email
      const roleId = body.roleId
      const organizationId = params.id as string

      const dto = new InviteUserDTO(organizationId, email, roleId)
      await inviteUser.execute(dto)

      if (request.accepts(['html', 'json']) === 'json') {
        response.json({
          success: true,
          message: 'Gửi lời mời thành công',
        })
        return
      }

      session.flash('success', 'Gửi lời mời thành công')
      response.redirect().toRoute('organizations.members.index', { id: params.id as string })
      return
    } catch (error: unknown) {
      loggerService.error('[InviteMemberController.handle] Error:', error)

      const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi gửi lời mời'

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
