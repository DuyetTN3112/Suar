import type { HttpContext } from '@adonisjs/core/http'


import { buildGetUserDetailDTO } from './mappers/request/user_request_mapper.js'
import { mapShowUserPageProps } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import GetUserDetailQuery from '#modules/users/actions/queries/get_user_detail_query'

/**
 * GET /users/:id → Show user detail
 */
export default class ShowUserController {
  async handle(ctx: HttpContext) {
    const getUserDetailQuery = new GetUserDetailQuery(actionContextFromHttp(ctx))
    const { params, inertia, auth } = ctx

    const dto = buildGetUserDetailDTO(String(params.id))
    const user = await getUserDetailQuery.handle(dto)

    const requestingUser = auth.getUserOrFail()
    if (requestingUser.id !== user.id && requestingUser.system_role !== 'superadmin' && requestingUser.system_role !== 'system_admin') {
      if (requestingUser.current_organization_id !== user.current_organization_id) {
        throw new ForbiddenException('Bạn không có quyền xem thông tin người dùng này')
      }
    }

    return inertia.render('users/show', mapShowUserPageProps(user))
  }
}
