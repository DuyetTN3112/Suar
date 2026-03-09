import type { HttpPlatformUiEventInput } from '#modules/http/actions/dtos/platform_ui_event'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'

export interface HttpPlatformUiEventWriter {
  record(input: HttpPlatformUiEventInput, execCtx: HttpActionContext): Promise<void>
}
