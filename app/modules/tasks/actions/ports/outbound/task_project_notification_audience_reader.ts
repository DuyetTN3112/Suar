import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

export interface TaskProjectNotificationAudienceReader {
  findManagerOrOwnerIds(
    projectId: string,
    excludeUserId: string,
    trx: TaskTransaction
  ): Promise<string[]>
}
