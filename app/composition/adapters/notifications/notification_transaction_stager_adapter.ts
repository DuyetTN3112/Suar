import type { OrganizationNotificationStager } from '#modules/organizations/actions/ports/outbound/directory/organization_notification_stager'
import type { ProjectNotificationStager } from '#modules/projects/actions/ports/outbound/project_notification_stager'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { UserNotificationStager } from '#modules/users/actions/ports/outbound/user_notification_stager'

interface NotificationAcceptanceStageCapability {
  stage(
    command: Parameters<TaskNotificationStager['stage']>[0],
    options: Parameters<TaskNotificationStager['stage']>[1]
  ): Promise<unknown>
}

export class NotificationTransactionStagerAdapter
  implements
    OrganizationNotificationStager,
    ProjectNotificationStager,
    TaskNotificationStager,
    UserNotificationStager
{
  constructor(private readonly notifications: NotificationAcceptanceStageCapability) {}

  async stage(
    command: Parameters<TaskNotificationStager['stage']>[0],
    options: Parameters<TaskNotificationStager['stage']>[1]
  ): Promise<unknown> {
    return this.notifications.stage(command, options)
  }
}
