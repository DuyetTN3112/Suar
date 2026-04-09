import type { HttpContext } from '@adonisjs/core/http'
import GetUserDetailQuery from '#actions/users/queries/get_user_detail_query'
import { ExecutionContext } from '#types/execution_context'
import { buildGetUserDetailDTO } from './mapper/request/user_request_mapper.js'
import { mapShowUserPageProps } from './mapper/response/user_response_mapper.js'

/**
 * GET /users/:id → Show user detail
 */
export default class ShowUserController {
  async handle(ctx: HttpContext) {
    const getUserDetailQuery = new GetUserDetailQuery(ExecutionContext.fromHttp(ctx))
    const { params, inertia } = ctx

    const dto = buildGetUserDetailDTO(String(params.id))
    const user = await getUserDetailQuery.handle(dto)

    return inertia.render('users/show', mapShowUserPageProps(user))
  }
}
