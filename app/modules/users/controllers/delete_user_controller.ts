import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteUserInput } from './mappers/request/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import DeleteUser from '#modules/users/actions/delete_user'

/**
 * DELETE /users/:id → Delete user (soft delete)
 */
export default class DeleteUserController {
  async handle(ctx: HttpContext) {
    const deleteUser = new DeleteUser(actionContextFromHttp(ctx))
    const { params, response, session } = ctx
    const userId = String(params['userId'])

    const result = await deleteUser.handle(buildDeleteUserInput(userId))
    session.flash(result.success ? 'success' : 'error', result.message)
    response.redirect().toRoute('users.index')
  }
}
