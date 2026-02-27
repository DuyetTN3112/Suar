import type { HttpContext } from '@adonisjs/core/http'

import { buildApproveUserDTO } from './mappers/request/user_request_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import ApproveUserCommand from '#modules/users/actions/commands/approve_user_command'

/**
 * PUT /users/:userId/approve → Approve a pending user in organization
 */
export default class ApproveUserController {
  async handle(ctx: HttpContext) {
    const approveUserCommand = new ApproveUserCommand(actionContextFromHttp(ctx))
    const { params, response, auth } = ctx
    const { user } = auth

    if (!user) {
      throw new UnauthorizedException()
    }

    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildApproveUserDTO(String(params['userId']), organizationId, user.id)
    await approveUserCommand.handle(dto)

    response.status(HttpStatus.NO_CONTENT).send(null)
  }
}
