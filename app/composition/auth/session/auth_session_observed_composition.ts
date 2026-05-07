import emitter from '@adonisjs/core/services/emitter'

import { processAuthSessionObservedCommand } from '#composition/auth/session/auth_application_composition'
import { onAuthSessionObserved } from '#modules/auth/listeners/on_auth_session_observed'
import type { AuthSessionObservedEvent } from '#modules/events/public_contracts/domain_event_outbox'

export function onComposedAuthSessionObserved(
  event: AuthSessionObservedEvent
): Promise<void> {
  return onAuthSessionObserved(event, processAuthSessionObservedCommand)
}

emitter.on('auth:session:observed:v1', onComposedAuthSessionObserved)
