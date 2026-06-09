import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { OrganizationMemberAdministrationCommandFactory } from '#modules/organizations/actions/ports/inbound/members/organization_member_administration_command_factory'
import { buildCurrentOrganizationRemoveMemberDTO } from '#modules/organizations/controllers/mappers/request/members/current_organization_mutation_request_mapper'
import { buildOrganizationMemberRouteRequest } from '#modules/organizations/controllers/mappers/request/members/organization_member_route_request_mapper'

/**
 * RemoveMemberController
 *
 * Remove member from org
 *
 * DELETE /org/members/:memberId
 */
@inject()
export default class RemoveMemberController {
  constructor(
    private readonly memberAdministrationCommands: OrganizationMemberAdministrationCommandFactory
  ) {}

  async handle(ctx: HttpContext) {
    const { request, params } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const { memberId } = buildOrganizationMemberRouteRequest(params)
    const dto = buildCurrentOrganizationRemoveMemberDTO(
      request,
      organizationId,
      memberId
    )

    await this.memberAdministrationCommands
      .makeRemove(execCtx)
      .executeAndWrap(dto)
      .then((outcome) => outcome.getValue())
    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'route',
        to: 'org.members.index',
      },
      successMessage: 'Xóa thành viên thành công',
    })
  }
}
