import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import UpdateMemberRoleCommand from '#modules/organizations/actions/commands/update_member_role_command'
import { buildCurrentOrganizationRoleUpdateInput } from '#modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper'

/**
 * UpdateMemberRoleController
 *
 * Update member org_role
 *
 * PUT /org/members/:memberId/role
 */
export default class UpdateMemberRoleController {
  async handle(ctx: HttpContext) {
    const { request, params } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const roleUpdateInput = buildCurrentOrganizationRoleUpdateInput(
      request,
      organizationId,
      params['memberId'] as string
    )
    await new UpdateMemberRoleCommand(execCtx, notificationPublicApi).executeFromRequest(
      roleUpdateInput,
      { resolveAssignableRoles: true }
    )
    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'route',
        to: 'org.members.index',
      },
      successMessage: 'Cập nhật vai trò thành công',
    })
  }
}
