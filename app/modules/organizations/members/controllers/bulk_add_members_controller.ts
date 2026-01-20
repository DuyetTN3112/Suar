import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { OrganizationMembershipCommandFactory } from '#modules/organizations/members/actions/ports/inbound/organization_membership_command_factory'
import { buildBulkAddMembersDTO } from '#modules/organizations/members/controllers/mappers/request/current_organization_mutation_request_mapper'

/**
 * BulkAddMembersController
 *
 * Add existing users to the current organization
 *
 * POST /org/members/add
 */
@inject()
export default class BulkAddMembersController {
  constructor(private readonly commandFactory: OrganizationMembershipCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { request } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = buildBulkAddMembersDTO(request, organizationId, execCtx.userId)
    const result = await this.commandFactory.makeBulkAdd(execCtx).execute(dto)

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'route',
        to: 'org.members.index',
      },
      successMessage: `Đã thêm ${result.addedCount} người dùng`,
    })
  }
}
