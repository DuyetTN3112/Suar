import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import BulkAddMembersCommand from '#actions/organizations/commands/bulk_add_members_command'
import { BulkAddMembersDTO } from '#actions/organizations/dtos/request/bulk_add_members_dto'
import loggerService from '#services/logger_service'
import { HttpStatus, ErrorMessages } from '#constants/error_constants'

/**
 * POST /organizations/users/add
 * Batch add multiple users to the organization
 */
export default class AddUsersController {
  async handle(ctx: HttpContext) {
    const { request, response, auth, session } = ctx

    const user = auth.user
    const organizationId = user?.current_organization_id
    if (!organizationId) {
      if (request.accepts(['html', 'json']) === 'json') {
        response.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: ErrorMessages.ORGANIZATION_NOT_FOUND,
        })
        return
      }
      session.flash('error', ErrorMessages.ORGANIZATION_NOT_FOUND)
      response.redirect().back()
      return
    }

    try {
      const userIds = request.input('user_ids', []) as string[]

      // Build DTO (validates inside constructor)
      const dto = new BulkAddMembersDTO(organizationId, userIds, user.id)

      // Execute command (permission check + bulk add inside)
      const command = new BulkAddMembersCommand(ExecutionContext.fromHttp(ctx))
      const { results, addedCount } = await command.execute(dto)

      if (request.accepts(['html', 'json']) === 'json') {
        response.json({
          success: true,
          message: `Đã thêm ${addedCount} người dùng vào tổ chức thành công`,
          results,
        })
        return
      }

      session.flash('success', `Đã thêm ${addedCount} người dùng vào tổ chức thành công`)
      response.redirect().toRoute('organizations.members.index', { id: organizationId })
      return
    } catch (error: unknown) {
      loggerService.error('[AddUsersController.handle] Error:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Đã xảy ra lỗi khi thêm người dùng vào tổ chức'

      if (request.accepts(['html', 'json']) === 'json') {
        response
          .status(error instanceof Error && error.message.includes('quyền') ? 403 : 500)
          .json({
            success: false,
            message: errorMessage,
          })
        return
      }
      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }
}
