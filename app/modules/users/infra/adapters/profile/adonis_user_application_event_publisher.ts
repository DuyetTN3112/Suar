import emitter from '@adonisjs/core/services/emitter'

import type {
  UserApplicationEventPublisher,
  UserSkillScoreUpdatedEvent,
} from '#modules/users/actions/ports/outbound/user_application_event_publisher'

export class AdonisUserApplicationEventPublisher implements UserApplicationEventPublisher {
  async publishSkillScoreUpdated(event: UserSkillScoreUpdatedEvent): Promise<void> {
    await emitter.emit('skill:score:updated', event)
  }

  async invalidateUserPermissionCache(userId: string): Promise<void> {
    await emitter.emit('cache:invalidate', {
      entityType: 'user',
      entityId: userId,
      patterns: [
        `tasks:grouped:*:user:${userId}:*`,
        `tasks:timeline:*:user:${userId}:*`,
        `task:stats:*:user:${userId}:*`,
      ],
    })
  }
}
