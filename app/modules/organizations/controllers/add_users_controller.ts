import type { HttpContext } from '@adonisjs/core/http'


import { buildBulkAddMembersDTO } from './mappers/request/organization_request_mapper.js'
import { mapOrganizationSuccessApiBody } from './mappers/response/organization_response_mapper.js'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import BulkAddMembersCommand from '#modules/organizations/actions/commands/bulk_add_members_command'

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
    const command = new BulkAddMembersCommand(actionContextFromHttp(ctx))
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
