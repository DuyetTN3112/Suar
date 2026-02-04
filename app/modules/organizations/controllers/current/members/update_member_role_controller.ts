import type { HttpContext } from '@adonisjs/core/http'

import { notificationPublicApi } from '#actions/notifications/public_api'
import UpdateMemberRoleCommand from '#actions/organizations/commands/update_member_role_command'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#modules/errors/constants/error_constants'
import { buildCurrentOrganizationRoleUpdateInput } from '#modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper'
import { mapCurrentOrganizationSuccessApiBody } from '#modules/organizations/controllers/current/mappers/response/current_organization_mutation_response_mapper'
import { ExecutionContext } from '#types/execution_context'

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
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const roleUpdateInput = buildCurrentOrganizationRoleUpdateInput(
      request,
      organizationId,
      params.id as string
    )
    await new UpdateMemberRoleCommand(execCtx, notificationPublicApi).executeFromRequest(
      roleUpdateInput,
      { resolveAssignableRoles: true }
    )

    if (request.accepts(['html', 'json']) === 'json') {
      response.json(mapCurrentOrganizationSuccessApiBody('Cập nhật vai trò thành công'))
      return
    }

    session.flash('success', 'Cập nhật vai trò thành công')
    response.redirect().toRoute('org.members.index')
  }
}
