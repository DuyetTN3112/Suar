import type { HttpContext } from '@adonisjs/core/http'

import { buildRecordSearchUiEventInput } from '#modules/http/controllers/mappers/request/search_event_request_mapper'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { recordSearchUiEvent } from '#modules/search/public_contracts/search_ui_events'

export default class SearchEventsApiController {
  async handle(ctx: HttpContext) {
    await recordSearchUiEvent(buildRecordSearchUiEventInput(ctx.request.body()), actionContextFromHttp(ctx))
    ctx.response.noContent()
  }
}
