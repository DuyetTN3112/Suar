import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteUserInput } from './mappers/request/user_request_mapper.js'

import DeleteUser from '#actions/users/delete_user'
import { ExecutionContext } from '#types/execution_context'

/**
 * DELETE /users/:id → Delete user (soft delete)
 */
export default class DeleteUserController {
  async handle(ctx: HttpContext) {
    const deleteUser = new DeleteUser(ExecutionContext.fromHttp(ctx))
    const { params, response, session } = ctx
    const userId = String(params.id)

    const result = await deleteUser.handle(buildDeleteUserInput(userId))
    session.flash(result.success ? 'success' : 'error', result.message)
    response.redirect().toRoute('users.index')
  }
}
