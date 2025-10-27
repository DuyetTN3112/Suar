import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import RecordSearchUiEventCommand, {
  type RecordSearchUiEventInput,
} from '#modules/search/actions/commands/record_search_ui_event_command'

export type { RecordSearchUiEventInput }

export async function recordSearchUiEvent(
  input: RecordSearchUiEventInput,
  execCtx: HttpActionContext
): Promise<void> {
  await new RecordSearchUiEventCommand().execute(input, execCtx)
}
