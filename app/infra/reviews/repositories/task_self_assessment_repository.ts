import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import TaskSelfAssessment from '#models/task_self_assessment'

export default class TaskSelfAssessmentRepository {
  private readonly __instanceMarker = true

  static {
    void new TaskSelfAssessmentRepository().__instanceMarker
  }

  private static baseQuery(trx?: TransactionClientContract) {
    return trx ? TaskSelfAssessment.query({ client: trx }) : TaskSelfAssessment.query()
  }

  static async findByTaskAssignmentAndUser(
    taskAssignmentId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskSelfAssessment | null> {
    return this.baseQuery(trx)
      .where('task_assignment_id', taskAssignmentId)
      .where('user_id', userId)
      .first()
  }

  static async create(
    data: Partial<TaskSelfAssessment>,
    trx?: TransactionClientContract
  ): Promise<TaskSelfAssessment> {
    return TaskSelfAssessment.create(data, trx ? { client: trx } : undefined)
  }

  static async save(
    assessment: TaskSelfAssessment,
    trx?: TransactionClientContract
  ): Promise<TaskSelfAssessment> {
    if (trx) {
      assessment.useTransaction(trx)
    }
    await assessment.save()
    return assessment
  }
}
