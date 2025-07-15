import type { HttpContext } from '@adonisjs/core/http'

import { buildApproveUserDTO } from './mappers/request/user_request_mapper.js'
import { mapSuccessMessageApiBody } from './mappers/response/user_response_mapper.js'

import ApproveUserCommand from '#actions/users/commands/approve_user_command'
import { HttpStatus } from '#constants/error_constants'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { ExecutionContext } from '#types/execution_context'

/**
 * PUT /users/:id/approve → Approve a pending user in organization
 */
export default class ApproveUserController {
  async handle(ctx: HttpContext) {
    const approveUserCommand = new ApproveUserCommand(ExecutionContext.fromHttp(ctx))
    const { params, response, auth } = ctx
    const { user } = auth

    if (!user) {
      throw new UnauthorizedException()
    }

    const organizationId = user.current_organization_id
    if (!organizationId) {
      response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Không tìm thấy thông tin tổ chức hiện tại',
      })
      return
    }

    const dto = buildApproveUserDTO(String(params.id), organizationId, user.id)
    await approveUserCommand.handle(dto)

    response.json(mapSuccessMessageApiBody('Người dùng đã được phê duyệt thành công'))
  }
}
