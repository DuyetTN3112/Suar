import RecordSearchUiEventCommand from '#modules/search/actions/commands/record_search_ui_event_command'
import type { SearchUiEventsCapability } from '#modules/search/public_contracts/search_ui_events'

const command = new RecordSearchUiEventCommand()

export const searchUiEventsCapability: SearchUiEventsCapability = {
  record: (input, execCtx) => command.execute(input, execCtx),
}
