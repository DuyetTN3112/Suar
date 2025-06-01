import type { HttpContext } from '@adonisjs/core/http'
import GetUserMetadata from '#actions/users/get_user_metadata'

/**
 * GET /conversations/create → Show create conversation form
 */
export default class CreateConversationController {
  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const getUserMetadata = new GetUserMetadata(ctx)
    const metadata = await getUserMetadata.handle()
    return inertia.render('conversations/create', { metadata })
  }
}
