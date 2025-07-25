import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import TaskSelfAssessment from '#infra/tasks/models/task_self_assessment'
import type { DatabaseId } from '#types/database'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? TaskSelfAssessment.query({ client: trx }) : TaskSelfAssessment.query()
}

export const findByTaskAssignmentAndUser = (
  taskAssignmentId: DatabaseId,
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<TaskSelfAssessment | null> => {
  return baseQuery(trx).where('task_assignment_id', taskAssignmentId).where('user_id', userId).first()
}
