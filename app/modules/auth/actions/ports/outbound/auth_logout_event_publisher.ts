export interface AuthLogoutEvent {
  userId: string
  ip: string
  sessionId?: string
}

export abstract class AuthLogoutEventPublisher {
  abstract publish(event: AuthLogoutEvent): Promise<void>
}
