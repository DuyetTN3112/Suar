import type { HttpContext } from '@adonisjs/core/http'
import type GetUserDetailQuery from '#actions/users/queries/get_user_detail_query'
import { GetUserDetailDTO } from '#actions/users/dtos/get_user_detail_dto'

/**
 * GET /users/:id → Show user detail
 */
export default class ShowUserController {
  async handle(ctx: HttpContext, getUserDetailQuery: GetUserDetailQuery) {
    const { params, inertia } = ctx

    const dto = new GetUserDetailDTO(String(params.id))
    const user = await getUserDetailQuery.handle(dto)

    return inertia.render('users/show', { user })
  }
}
