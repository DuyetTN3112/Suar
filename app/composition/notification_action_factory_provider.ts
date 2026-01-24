import type { ApplicationService } from '@adonisjs/core/types'

import { notificationActionFactory } from '#composition/notification_feed_composition'
import { NotificationActionFactory } from '#modules/notifications/actions/ports/inbound/notification_action_factory'

export default class NotificationActionFactoryProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    this.app.container.singleton(NotificationActionFactory, () => notificationActionFactory)
  }
}
