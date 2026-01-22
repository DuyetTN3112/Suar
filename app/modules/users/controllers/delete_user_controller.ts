import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteUserInput } from './mappers/request/user_request_mapper.js'

import AppException from '#modules/errors/public_contracts/application_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserAccountActionFactory } from '#modules/users/actions/ports/inbound/user_account_action_factory'

/**
 * DELETE /users/:id → Delete user (soft delete)
 */
@inject()
export default class DeleteUserController {
  constructor(private readonly actions: UserAccountActionFactory) {}

  async handle(ctx: HttpContext) {
    const deleteUser = this.actions.makeDelete(actionContextFromHttp(ctx))
    const { params, response, session } = ctx
    const userId = String(params['userId'])

    try {
      const result = await deleteUser.handle(buildDeleteUserInput(userId))
      session.flash('success', result.message)
    } catch (error) {
      if (!(error instanceof AppException) || error.status >= 500) {
        throw error
      }
      session.flash('error', error.safeMessage)
    }

    response.redirect().toRoute('users.index')
  }
}
