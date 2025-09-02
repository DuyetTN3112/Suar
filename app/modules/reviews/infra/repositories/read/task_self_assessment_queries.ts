import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import TaskSelfAssessment from '../../../../tasks/infra/models/task_self_assessment.js'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? TaskSelfAssessment.query({ client: trx }) : TaskSelfAssessment.query()
}

export const findByTaskAssignmentAndUser = (
  taskAssignmentId: string,
  userId: string,
  trx?: TransactionClientContract
): Promise<TaskSelfAssessment | null> => {
  return baseQuery(trx).where('task_assignment_id', taskAssignmentId).where('user_id', userId).first()
}
