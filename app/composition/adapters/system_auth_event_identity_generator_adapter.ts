import { randomUUID } from 'node:crypto'

import {
  AuthEventIdentityGenerator,
  type AuthEventIdentity,
} from '#modules/auth/actions/ports/outbound/auth_event_identity_generator'

export class SystemAuthEventIdentityGeneratorAdapter extends AuthEventIdentityGenerator {
  next(): AuthEventIdentity {
    return {
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
    }
  }
}
