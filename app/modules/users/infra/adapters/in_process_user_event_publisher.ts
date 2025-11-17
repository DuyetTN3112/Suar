import emitter from '@adonisjs/core/services/emitter'

import type { UserEventPublisher } from '#modules/users/application/ports/user_event_publisher'
import type {
  UserApprovedEvent,
  UserDeactivatedEvent,
  UserProfileUpdatedEvent,
  UserRegisteredEvent,
} from '#modules/users/events/user_events'

export class InProcessUserEventPublisher implements UserEventPublisher {
  async publishUserRegistered(event: UserRegisteredEvent): Promise<void> {
    await emitter.emit('user:registered', event)
  }

  async publishUserApproved(event: UserApprovedEvent): Promise<void> {
    await emitter.emit('user:approved', event)
  }

  async publishUserDeactivated(event: UserDeactivatedEvent): Promise<void> {
    await emitter.emit('user:deactivated', event)
  }

  async publishUserProfileUpdated(event: UserProfileUpdatedEvent): Promise<void> {
    await emitter.emit('user:profile:updated', event)
  }
}
