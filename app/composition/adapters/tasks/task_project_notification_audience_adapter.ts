import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import * as projectMemberQueries from '#modules/projects/infra/repositories/project-members/read/project_member_queries'
import type { TaskProjectNotificationAudienceReader } from '#modules/tasks/actions/ports/outbound/task_project_notification_audience_reader'

export class TaskProjectNotificationAudienceAdapter
  implements TaskProjectNotificationAudienceReader
{
  findManagerOrOwnerIds(
    projectId: string,
    excludeUserId: string,
    trx: Parameters<TaskProjectNotificationAudienceReader['findManagerOrOwnerIds']>[2]
  ): Promise<string[]> {
    return projectMemberQueries.findManagerOrOwnerIds(
      projectId,
      excludeUserId,
      trx as TransactionClientContract
    )
  }
}

