import RecordPlatformUiEventCommand from '#modules/observability/actions/commands/record_platform_ui_event_command'
import type { PlatformUiEventsCapability } from '#modules/observability/public_contracts/platform_ui_events'

const command = new RecordPlatformUiEventCommand()

export const platformUiEventsCapability: PlatformUiEventsCapability = {
  record: (input, execCtx) => command.execute(input, execCtx),
}
