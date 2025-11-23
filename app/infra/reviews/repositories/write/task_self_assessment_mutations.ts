import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import TaskSelfAssessment from '#infra/tasks/models/task_self_assessment'

export const create = (
  data: Partial<TaskSelfAssessment>,
  trx?: TransactionClientContract
): Promise<TaskSelfAssessment> => {
  return TaskSelfAssessment.create(data, trx ? { client: trx } : undefined)
}

export const save = async (
  assessment: TaskSelfAssessment,
  trx?: TransactionClientContract
): Promise<TaskSelfAssessment> => {
  if (trx) {
    assessment.useTransaction(trx)
  }
  await assessment.save()
  return assessment
}
