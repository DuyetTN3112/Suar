import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import RemoveMemberCommand from '#actions/organizations/commands/remove_member_command'
import { RemoveMemberDTO } from '#actions/organizations/dtos/remove_member_dto'
import CreateNotification from '#actions/common/create_notification'
import loggerService from '#services/logger_service'
import { HttpStatus } from '#constants/error_constants'

/**
 * DELETE /organizations/:id/members/:userId
 * Remove a member from the organization
 */
export default class RemoveMemberController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const removeMember = new RemoveMemberCommand(
      ExecutionContext.fromHttp(ctx),
      new CreateNotification()
    )

    try {
      const dto = new RemoveMemberDTO(params.id as string, params.userId as string)
      await removeMember.execute(dto)

      if (request.accepts(['html', 'json']) === 'json') {
        response.json({
          success: true,
          message: 'Xóa thành viên thành công',
        })
        return
      }

      session.flash('success', 'Xóa thành viên thành công')
      response.redirect().toRoute('organizations.members.index', { id: params.id as string })
      return
    } catch (error: unknown) {
      loggerService.error('[RemoveMemberController.handle] Error:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xóa thành viên'

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
