import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { OrganizationMemberApprovalCommandFactory } from '#modules/organizations/members/actions/ports/inbound/organization_member_approval_command_factory'

/**
 * PUT /users/:userId/approve — approve a pending organization membership.
 */
@inject()
export default class ApprovePendingMemberController {
  constructor(private readonly approvalCommands: OrganizationMemberApprovalCommandFactory) {}

  async handle(ctx: HttpContext) {
    if (!ctx.auth.user) {
      throw new UnauthorizedException()
    }

    await this.approvalCommands.make(actionContextFromHttp(ctx)).execute({
      organizationId: requireCurrentOrganizationId(ctx),
      targetUserId: String(ctx.params['userId']),
    })

    ctx.response.status(HttpStatus.NO_CONTENT).send(null)
  }
}
