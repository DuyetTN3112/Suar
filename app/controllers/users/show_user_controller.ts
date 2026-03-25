import type { HttpContext } from '@adonisjs/core/http'
import GetUserDetailQuery from '#actions/users/queries/get_user_detail_query'
import { GetUserDetailDTO } from '#actions/users/dtos/request/get_user_detail_dto'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /users/:id → Show user detail
 */
export default class ShowUserController {
  async handle(ctx: HttpContext) {
    const getUserDetailQuery = new GetUserDetailQuery(ExecutionContext.fromHttp(ctx))
    const { params, inertia } = ctx

    const dto = new GetUserDetailDTO(String(params.id))
    const user = await getUserDetailQuery.handle(dto)

    return inertia.render('users/show', { user })
  }
}
