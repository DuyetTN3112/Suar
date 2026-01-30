import type { HttpSearchUiEventInput } from '#modules/http/actions/dtos/search_ui_event'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import type {
  HttpSearchUiEventWriter,
} from '#modules/http/actions/ports/outbound/http_search_ui_event_writer'

export default class RecordSearchUiEventCommand {
  constructor(private readonly events: HttpSearchUiEventWriter) {}

  execute(input: HttpSearchUiEventInput, execCtx: HttpActionContext): Promise<void> {
    return this.events.record(input, execCtx)
  }
}
