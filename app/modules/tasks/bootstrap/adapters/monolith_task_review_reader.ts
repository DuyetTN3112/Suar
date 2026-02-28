import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { reviewPublicApi } from '#modules/reviews/public_contracts/review_public_api'
import type { TaskReviewReader } from '#modules/tasks/actions/ports/task_external_dependencies'

export class MonolithTaskReviewReader implements TaskReviewReader {
  async hasAnyReviewForTask(taskId: string, trx?: TransactionClientContract): Promise<boolean> {
    return reviewPublicApi.hasAnyForTask(taskId, trx)
  }

  async hasAnyReviewForTasksWithStatus(
    taskStatusId: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return reviewPublicApi.hasAnyForTasksWithStatus(taskStatusId, trx)
  }
}
