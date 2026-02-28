import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import AddMemberCommand from '#actions/organizations/commands/add_member_command'
import { AddMemberDTO } from '#actions/organizations/dtos/add_member_dto'
import CreateNotification from '#actions/common/create_notification'
import loggerService from '#services/logger_service'

/**
 * POST /organizations/:id/members/add-direct
 * Add user directly to organization (for admin)
 */
export default class AddDirectMemberController {
  async handle(ctx: HttpContext) {
    const { params, request, response, session } = ctx

    const addMember = new AddMemberCommand(ExecutionContext.fromHttp(ctx), new CreateNotification())

    try {
      const body = request.body() as { userId: string; roleId: string }
      const userId = body.userId
      const roleId = body.roleId

      // AddMemberCommand already validates user existence
      const dto = new AddMemberDTO(params.id as string, userId, roleId)
      await addMember.execute(dto)

      if (request.accepts(['html', 'json']) === 'json') {
        response.json({
          success: true,
          message: 'Thêm thành viên thành công',
        })
        return
      }

      session.flash('success', 'Thêm thành viên thành công')
      response.redirect().toRoute('organizations.members.index', { id: params.id as string })
      return
    } catch (error: unknown) {
      loggerService.error('[AddDirectMemberController.handle] Error:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi thêm thành viên'

      if (request.accepts(['html', 'json']) === 'json') {
        response.status(400).json({
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
