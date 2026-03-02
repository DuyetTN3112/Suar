import { TaskProjectNotificationAudienceAdapter } from './adapters/task_project_notification_audience_adapter.js'

import { taskExternalDeps } from '#composition/task_external_dependencies_composition'
import {
  notificationFanoutPublicApi,
  type NotificationFanoutStagerContract,
} from '#modules/notifications/public_contracts/notification_fanout'
import RevokeTaskAccessCommand from '#modules/tasks/actions/commands/revoke_task_access_command'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { InProcessTaskEventPublisher } from '#modules/tasks/infra/adapters/in_process_task_event_publisher'
import { TaskCacheInvalidator } from '#modules/tasks/infra/cache/task_cache_invalidator'

export const taskProjectNotificationAudienceReader =
  new TaskProjectNotificationAudienceAdapter()

export function makeRevokeTaskAccessCommand(
  context: TaskActionContext,
  notificationFanout: NotificationFanoutStagerContract = notificationFanoutPublicApi,
  taskEventPublisher?: TaskEventPublisher
) {
  return new RevokeTaskAccessCommand(
    context,
    notificationFanout,
    taskExternalDeps,
    taskProjectNotificationAudienceReader,
    new TaskCacheInvalidator(),
    taskEventPublisher ?? new InProcessTaskEventPublisher()
  )
}
