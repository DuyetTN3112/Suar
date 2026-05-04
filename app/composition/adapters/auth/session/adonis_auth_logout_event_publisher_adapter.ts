import emitter from '@adonisjs/core/services/emitter'

import {
  AuthLogoutEventPublisher,
  type AuthLogoutEvent,
} from '#modules/auth/actions/ports/outbound/auth_logout_event_publisher'

export class AdonisAuthLogoutEventPublisherAdapter extends AuthLogoutEventPublisher {
  async publish(event: AuthLogoutEvent): Promise<void> {
    await emitter.emit('user:logout', event)
  }
}
