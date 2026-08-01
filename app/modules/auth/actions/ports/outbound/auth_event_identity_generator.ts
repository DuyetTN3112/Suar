export interface AuthEventIdentity {
  eventId: string
  occurredAt: string
}

export abstract class AuthEventIdentityGenerator {
  abstract next(): AuthEventIdentity
}
