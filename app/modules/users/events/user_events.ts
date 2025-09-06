
export interface UserApprovedEvent {
  userId: string
  approvedBy: string
  organizationId: string
}

export interface UserDeactivatedEvent {
  userId: string
  deactivatedBy: string
  reason?: string
}

export interface UserProfileUpdatedEvent {
  userId: string
  changes: Record<string, unknown>
}

export interface UserLoginEvent {
  userId: string
  ip: string
  userAgent: string
  method: string
}

export interface UserLogoutEvent {
  userId: string
  ip: string
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'user:approved': UserApprovedEvent
    'user:deactivated': UserDeactivatedEvent
    'user:profile:updated': UserProfileUpdatedEvent
    'user:login': UserLoginEvent
    'user:logout': UserLogoutEvent
  }
}
