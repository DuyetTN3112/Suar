import type { HttpContext } from '@adonisjs/core/http'

import { mapOrganizationDetailApiBody } from './mappers/response/organization_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { GetOrganizationDetailDTO } from '#modules/organizations/actions/dtos/request/get_organization_detail_dto'
import GetOrganizationDetailQuery from '#modules/organizations/actions/queries/get_organization_detail_query'

export default class ShowOrganizationApiController {
  async handle(ctx: HttpContext) {
    const { auth, params, response } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }

    const query = new GetOrganizationDetailQuery(actionContextFromHttp(ctx))
    const result = await query.execute(
      new GetOrganizationDetailDTO(params.id as string, true, true, true)
    )

    response.json(mapOrganizationDetailApiBody(result))
  }
}
