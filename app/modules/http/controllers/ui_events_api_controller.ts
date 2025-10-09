import type { HttpContext } from '@adonisjs/core/http'

import { buildRecordPlatformUiEventInput } from '#modules/http/controllers/mappers/request/ui_event_request_mapper'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { recordPlatformUiEvent } from '#modules/observability/public_contracts/platform_ui_events'

export default class UiEventsApiController {
  async handle(ctx: HttpContext) {
    await recordPlatformUiEvent(
      buildRecordPlatformUiEventInput(ctx.request.body()),
      actionContextFromHttp(ctx)
    )
    ctx.response.noContent()
  }
}
