import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { OrganizationMemberApprovalCommandFactory } from '#modules/organizations/actions/ports/inbound/members/organization_member_approval_command_factory'
import { buildApprovePendingMemberRequest } from '../mappers/request/members/approve_pending_member_request_mapper.js'

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

    const { userId: targetUserId } = buildApprovePendingMemberRequest(ctx.params)
    await this.approvalCommands
      .make(actionContextFromHttp(ctx))
      .executeAndWrap({
        organizationId: requireCurrentOrganizationId(ctx),
        targetUserId,
      })
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.NO_CONTENT).send(null)
  }
}
