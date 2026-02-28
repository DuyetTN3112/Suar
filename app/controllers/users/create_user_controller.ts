import type { HttpContext } from '@adonisjs/core/http'
import type GetUserMetadata from '#actions/users/get_user_metadata'

/**
 * GET /users/create → Show create user form
 */
export default class CreateUserController {
  async handle(ctx: HttpContext, getUserMetadata: GetUserMetadata) {
    const { inertia } = ctx
    const metadata = await getUserMetadata.handle()
    return inertia.render('users/create', { metadata })
  }
}
