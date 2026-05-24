import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import RecordSearchUiEventCommand from '#modules/http/actions/commands/record_search_ui_event_command'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { buildRecordSearchUiEventInput } from '#modules/http/controllers/mappers/request/search-discovery/search_event_request_mapper'

@inject()
export default class SearchEventsApiController {
  constructor(private readonly recordSearchUiEvent: RecordSearchUiEventCommand) {}

  async handle(ctx: HttpContext) {
    await this.recordSearchUiEvent
      .executeAndWrap(buildRecordSearchUiEventInput(ctx.request.body()), actionContextFromHttp(ctx))
      .then((outcome) => outcome.getValue())
    ctx.response.noContent()
  }
}
