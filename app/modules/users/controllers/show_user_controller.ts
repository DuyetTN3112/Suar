import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildGetUserDetailDTO } from './mappers/request/user_request_mapper.js'
import { mapShowUserPageProps } from './mappers/response/user_response_mapper.js'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserProfilePageQueryFactory } from '#modules/users/actions/ports/inbound/user_profile_page_query_factory'

/**
 * GET /users/:id → Show user detail
 */
@inject()
export default class ShowUserController {
  constructor(private readonly profileQueries: UserProfilePageQueryFactory) {}

  async handle(ctx: HttpContext) {
    const getUserDetailQuery = this.profileQueries.makeDetail(actionContextFromHttp(ctx))
    const { params, inertia, auth } = ctx

    const dto = buildGetUserDetailDTO(String(params['userId']))
    const user = await getUserDetailQuery.handle(dto)

    const requestingUser = auth.getUserOrFail()
    if (
      requestingUser.id !== user.id &&
      requestingUser.system_role !== 'superadmin' &&
      requestingUser.system_role !== 'system_admin'
    ) {
      if (requestingUser.current_organization_id !== user.current_organization_id) {
        throw new ForbiddenException('Bạn không có quyền xem thông tin người dùng này')
      }
    }

    return inertia.render('users/show', mapShowUserPageProps(user))
  }
}
