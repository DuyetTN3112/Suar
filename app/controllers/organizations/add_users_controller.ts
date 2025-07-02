import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import BulkAddMembersCommand from '#actions/organizations/commands/bulk_add_members_command'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import { buildBulkAddMembersDTO } from './mapper/request/organization_request_mapper.js'
import { mapOrganizationSuccessApiBody } from './mapper/response/organization_response_mapper.js'

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
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = buildBulkAddMembersDTO(request, organizationId, user.id)

    // Execute command (permission check + bulk add inside)
    const command = new BulkAddMembersCommand(ExecutionContext.fromHttp(ctx))
    const { results, addedCount } = await command.execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(
        mapOrganizationSuccessApiBody(`Đã thêm ${addedCount} người dùng vào tổ chức thành công`, {
          results,
        })
      )
      return
    }

    session.flash('success', `Đã thêm ${addedCount} người dùng vào tổ chức thành công`)
    response.redirect().toRoute('organizations.members.index', { id: organizationId })
  }
}
