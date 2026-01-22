import type { HttpPlatformUiEventInput } from '#modules/http/actions/dtos/platform_ui_event'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import type {
  HttpPlatformUiEventWriter,
} from '#modules/http/actions/ports/outbound/http_platform_ui_event_writer'
import type { PlatformUiEventsCapability } from '#modules/observability/public_contracts/platform_ui_events'

export class HttpPlatformUiEventWriterAdapter implements HttpPlatformUiEventWriter {
  constructor(private readonly eventsCapability: PlatformUiEventsCapability) {}

  record(input: HttpPlatformUiEventInput, execCtx: HttpActionContext): Promise<void> {
    return this.eventsCapability.record(input, execCtx)
  }
}
