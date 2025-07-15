import type { HttpContext } from '@adonisjs/core/http'

import { buildGetUserDetailDTO } from './mappers/request/user_request_mapper.js'
import { mapEditUserPageProps } from './mappers/response/user_response_mapper.js'

import GetUserMetadata from '#actions/users/get_user_metadata'
import GetUserDetailQuery from '#actions/users/queries/get_user_detail_query'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /users/:id/edit → Show edit user form
 */
export default class EditUserController {
  async handle(ctx: HttpContext) {
    const getUserDetailQuery = new GetUserDetailQuery(ExecutionContext.fromHttp(ctx))
    const getUserMetadata = new GetUserMetadata()
    const { params, inertia } = ctx

    const dto = buildGetUserDetailDTO(String(params.id))
    const user = await getUserDetailQuery.handle(dto)
    const metadata = getUserMetadata.handle()

    return inertia.render('users/edit', mapEditUserPageProps(user, metadata))
  }
}
