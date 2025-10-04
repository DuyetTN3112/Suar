import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import RemoveMemberCommand from '#modules/organizations/actions/commands/remove_member_command'
import { buildCurrentOrganizationRemoveMemberDTO } from '#modules/organizations/controllers/current/mappers/request/current_organization_mutation_request_mapper'

/**
 * RemoveMemberController
 *
 * Remove member from org
 *
 * DELETE /org/members/:memberId
 */
export default class RemoveMemberController {
  async handle(ctx: HttpContext) {
    const { request, params } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = buildCurrentOrganizationRemoveMemberDTO(
      request,
      organizationId,
      params['memberId'] as string
    )

    await new RemoveMemberCommand(execCtx, notificationPublicApi).execute(dto)
    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'route',
        to: 'org.members.index',
      },
      successMessage: 'Xóa thành viên thành công',
    })
  }
}
