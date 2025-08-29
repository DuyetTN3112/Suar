
export interface NotificationCreatedEvent {
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'notification:created': NotificationCreatedEvent
  }
}
