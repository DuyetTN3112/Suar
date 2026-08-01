import type ProcessAuthSessionObservedCommand from '#modules/auth/actions/commands/process_auth_session_observed_command'
import type { AuthSessionObservedEvent } from '#modules/events/public_contracts/domain_event_outbox'

export function onAuthSessionObserved(
  event: AuthSessionObservedEvent,
  command: ProcessAuthSessionObservedCommand
): Promise<void> {
  return command.execute(event, event.deliveryContext?.signal)
}
