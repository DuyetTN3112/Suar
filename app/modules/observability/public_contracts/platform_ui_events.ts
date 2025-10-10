import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import RecordPlatformUiEventCommand, {
  type RecordPlatformUiEventInput,
} from '#modules/observability/actions/commands/record_platform_ui_event_command'

export type { RecordPlatformUiEventInput }

export async function recordPlatformUiEvent(
  input: RecordPlatformUiEventInput,
  execCtx: HttpActionContext
): Promise<void> {
  await new RecordPlatformUiEventCommand().execute(input, execCtx)
}
