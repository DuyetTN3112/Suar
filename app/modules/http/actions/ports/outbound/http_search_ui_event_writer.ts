import type { HttpSearchUiEventInput } from '#modules/http/actions/dtos/search_ui_event'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'

export interface HttpSearchUiEventWriter {
  record(input: HttpSearchUiEventInput, execCtx: HttpActionContext): Promise<void>
}
