export interface CacheInvalidationEvent {
  entityType: string
  entityId?: number | string
  patterns?: string[]
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'cache:invalidate': CacheInvalidationEvent
  }
}
