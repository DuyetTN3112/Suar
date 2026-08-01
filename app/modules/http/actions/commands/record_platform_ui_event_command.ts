import type { HttpPlatformUiEventInput } from '#modules/http/actions/dtos/platform_ui_event'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import type {
  HttpPlatformUiEventWriter,
} from '#modules/http/actions/ports/outbound/http_platform_ui_event_writer'

export default class RecordPlatformUiEventCommand {
  constructor(private readonly events: HttpPlatformUiEventWriter) {}

  execute(input: HttpPlatformUiEventInput, execCtx: HttpActionContext): Promise<void> {
    return this.events.record(input, execCtx)
  }
}
