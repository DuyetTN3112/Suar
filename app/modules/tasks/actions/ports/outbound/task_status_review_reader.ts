import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

export interface TaskStatusReviewReader {
  hasAnyReviewForTasksWithStatus(
    taskStatusId: string,
    trx?: TaskTransaction
  ): Promise<boolean>
}
