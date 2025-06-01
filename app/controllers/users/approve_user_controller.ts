import type { HttpContext } from '@adonisjs/core/http'
import type ApproveUserCommand from '#actions/users/commands/approve_user_command'
import { ApproveUserDTO } from '#actions/users/dtos/approve_user_dto'
import UnauthorizedException from '#exceptions/unauthorized_exception'

/**
 * PUT /users/:id/approve → Approve a pending user in organization
 */
export default class ApproveUserController {
  async handle(ctx: HttpContext, approveUserCommand: ApproveUserCommand) {
    const { params, response, auth } = ctx

    const organizationId = auth.user?.current_organization_id
    if (!organizationId) {
      response.status(400).json({
        success: false,
        message: 'Không tìm thấy thông tin tổ chức hiện tại',
      })
      return
    }

    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }

    const dto = new ApproveUserDTO(String(params.id), organizationId, user.id)
    await approveUserCommand.handle(dto)

    response.json({
      success: true,
      message: 'Người dùng đã được phê duyệt thành công',
    })
  }
}
