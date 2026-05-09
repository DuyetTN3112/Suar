import {
  auditLogger,
  operationalLogger,
} from '#composition/observability/platform/platform_operational_logger_composition'
import RecordPlatformUiEventCommand from '#modules/observability/actions/commands/operational-events/record_platform_ui_event_command'
import type { PlatformUiEventsCapability } from '#modules/observability/public_contracts/platform_ui_events'

const command = new RecordPlatformUiEventCommand(
  undefined,
  operationalLogger,
  auditLogger
)

export const platformUiEventsCapability: PlatformUiEventsCapability = {
  record: (input, execCtx) => command.execute(input, execCtx),
}
