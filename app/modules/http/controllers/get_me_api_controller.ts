import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import { buildMeResponsePayload } from '#modules/http/controllers/support/build_me_response_payload'

/**
 * GET /api/me → Get current authenticated user
 */
export default class GetMeApiController {
  async handle(ctx: HttpContext) {
    const data = await buildMeResponsePayload(ctx)
    return wrapApiV1Data(data)
  }
}
