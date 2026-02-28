import type { HttpContext } from '@adonisjs/core/http'
import type DeleteUser from '#actions/users/delete_user'

/**
 * DELETE /users/:id → Delete user (soft delete)
 */
export default class DeleteUserController {
  async handle(ctx: HttpContext, deleteUser: DeleteUser) {
    const { params, response, session } = ctx

    const result = await deleteUser.handle({ id: params.id })
    session.flash(result.success ? 'success' : 'error', result.message)
    response.redirect().toRoute('users.index')
  }
}
