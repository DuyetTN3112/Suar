import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import RecordPlatformUiEventCommand from '#modules/http/actions/commands/record_platform_ui_event_command'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { buildRecordPlatformUiEventInput } from '#modules/http/controllers/mappers/request/ui_event_request_mapper'

@inject()
export default class UiEventsApiController {
  constructor(private readonly recordPlatformUiEvent: RecordPlatformUiEventCommand) {}

  async handle(ctx: HttpContext) {
    await this.recordPlatformUiEvent.execute(
      buildRecordPlatformUiEventInput(ctx.request.body()),
      actionContextFromHttp(ctx)
    )
    ctx.response.noContent()
  }
}
