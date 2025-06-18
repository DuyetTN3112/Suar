import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetUserDetailQuery from '#actions/users/queries/get_user_detail_query'
import GetUserMetadata from '#actions/users/get_user_metadata'
import { GetUserDetailDTO } from '#actions/users/dtos/request/get_user_detail_dto'

/**
 * GET /users/:id/edit → Show edit user form
 */
export default class EditUserController {
  async handle(ctx: HttpContext) {
    const getUserDetailQuery = new GetUserDetailQuery(ExecutionContext.fromHttp(ctx))
    const getUserMetadata = new GetUserMetadata()
    const { params, inertia } = ctx

    const dto = new GetUserDetailDTO(String(params.id))
    const user = await getUserDetailQuery.handle(dto)
    const metadata = getUserMetadata.handle()

    return inertia.render('users/edit', { user, metadata })
  }
}
