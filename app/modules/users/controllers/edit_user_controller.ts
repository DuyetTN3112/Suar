import type { HttpContext } from '@adonisjs/core/http'


import { buildGetUserDetailDTO } from './mappers/request/user_request_mapper.js'
import { mapEditUserPageProps } from './mappers/response/user_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetUserMetadata from '#modules/users/actions/get_user_metadata'
import GetUserDetailQuery from '#modules/users/actions/queries/get_user_detail_query'

/**
 * GET /users/:id/edit → Show edit user form
 */
export default class EditUserController {
  async handle(ctx: HttpContext) {
    const getUserDetailQuery = new GetUserDetailQuery(actionContextFromHttp(ctx))
    const getUserMetadata = new GetUserMetadata()
    const { params, inertia } = ctx

    const dto = buildGetUserDetailDTO(String(params.id))
    const user = await getUserDetailQuery.handle(dto)
    const metadata = getUserMetadata.handle()

    return inertia.render('users/edit', mapEditUserPageProps(user, metadata))
  }
}
