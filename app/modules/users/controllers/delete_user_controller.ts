import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteUserInput } from './mappers/request/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import DeleteUser from '#modules/users/actions/delete_user'

/**
 * DELETE /users/:id → Delete user (soft delete)
 */
export default class DeleteUserController {
  async handle(ctx: HttpContext) {
    const deleteUser = new DeleteUser(actionContextFromHttp(ctx))
    const { params, response, session } = ctx
    const userId = String(params.id)

    const result = await deleteUser.handle(buildDeleteUserInput(userId))
    session.flash(result.success ? 'success' : 'error', result.message)
    response.redirect().toRoute('users.index')
  }
}
