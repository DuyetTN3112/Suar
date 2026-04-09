import type { HttpContext } from '@adonisjs/core/http'
import GetUserMetadata from '#actions/users/get_user_metadata'
import { mapUserMetadataPageProps } from './mapper/response/user_response_mapper.js'

/**
 * GET /users/create → Show create user form
 */
export default class CreateUserController {
  async handle(ctx: HttpContext) {
    const getUserMetadata = new GetUserMetadata()
    const { inertia } = ctx
    const metadata = getUserMetadata.handle()
    return inertia.render('users/create', mapUserMetadataPageProps(metadata))
  }
}
