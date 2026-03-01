import type { HttpContext } from '@adonisjs/core/http'


import { buildGetUserDetailDTO } from './mappers/request/user_request_mapper.js'
import { mapShowUserPageProps } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetUserDetailQuery from '#modules/users/actions/queries/get_user_detail_query'

/**
 * GET /users/:id → Show user detail
 */
export default class ShowUserController {
  async handle(ctx: HttpContext) {
    const getUserDetailQuery = new GetUserDetailQuery(actionContextFromHttp(ctx))
    const { params, inertia } = ctx

    const dto = buildGetUserDetailDTO(String(params.id))
    const user = await getUserDetailQuery.handle(dto)

    return inertia.render('users/show', mapShowUserPageProps(user))
  }
}
